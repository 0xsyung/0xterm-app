/**
 * @file userSignedConnect.test.ts
 * @description Soft ACK #260/#262/#264/#266 — sign-first, Soft sticky Soft-fail Soft-map, Cancel dismiss
 */
import { describe, expect, it, vi } from "vitest";
import {
  HL_CONNECT_BUSY_TIMEOUT_MS,
  HL_CONNECT_CANCEL_DISMISS_ERROR,
  HL_CONNECT_CANCEL_DISMISS_GRACE_MS,
  HL_CONNECT_CHAIN_MISMATCH,
  HL_CONNECT_FAILED,
  HL_CONNECT_SESSION_STALE,
  HL_CONNECT_SWITCH_WALLET_CTA,
  HL_CONNECT_TIMEOUT_COPY,
  HL_CONNECT_USER_CANCELLED,
  alignHlSignatureChain,
  formatHlConnectStickyError,
  isHlConnectChainMismatch,
  isHlConnectSessionStale,
  isHlConnectUserCancelled,
  isWalletUserRejected,
  raceHlUserSignedAttemptWithCancelDismiss,
  runHlUserSignedWithOptionalChainRetry,
  shouldRetryHlUserSignedWithChainSwitch
} from "./userSignedConnect";

describe("userSignedConnect (#260)", () => {
  it("exports a ~15s busy timeout + retry copy", () => {
    expect(HL_CONNECT_BUSY_TIMEOUT_MS).toBe(15_000);
    expect(HL_CONNECT_TIMEOUT_COPY).toMatch(/retry/i);
  });

  it("detects user reject and skips chain retry", () => {
    expect(isWalletUserRejected("User rejected the request.")).toBe(true);
    expect(shouldRetryHlUserSignedWithChainSwitch("User rejected the request.")).toBe(
      false
    );
  });

  it("retries on chain surface, not HL exchange business / signer mismatch", () => {
    expect(
      shouldRetryHlUserSignedWithChainSwitch("Wrong network — switch to Arbitrum")
    ).toBe(true);
    expect(
      shouldRetryHlUserSignedWithChainSwitch("approveAgent signature rejected.")
    ).toBe(true);
    expect(
      shouldRetryHlUserSignedWithChainSwitch("Must deposit before performing actions")
    ).toBe(false);
    expect(
      shouldRetryHlUserSignedWithChainSwitch("Hyperliquid /exchange HTTP 500")
    ).toBe(false);
    // Soft ACK #262: signer mismatch must NOT chain-retry after Approve.
    expect(
      shouldRetryHlUserSignedWithChainSwitch(
        "Signature was signed by 0xabc, not the connected account 0xdef. Switch to that account in your wallet and try again."
      )
    ).toBe(false);
    // Soft ACK #262: bare "sign"/"wallet" Soft-noise must not Soft-trigger Soft-retry.
    expect(
      shouldRetryHlUserSignedWithChainSwitch("wallet session noise without chain")
    ).toBe(false);
  });

  it("signs first without ensureSignatureChain when attempt succeeds", async () => {
    const ensureSignatureChain = vi.fn();
    const attempt = vi.fn().mockResolvedValue({ ok: true });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt
    });
    expect(res).toEqual({ ok: true, retriedWithChainSwitch: false });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(ensureSignatureChain).not.toHaveBeenCalled();
  });

  it("does not switch+retry on user reject", async () => {
    const ensureSignatureChain = vi.fn();
    const attempt = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "User rejected the request." });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/rejected/i);
    expect(res.retriedWithChainSwitch).toBe(false);
    expect(ensureSignatureChain).not.toHaveBeenCalled();
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("aligns chain + retries once on chain-looking failure", async () => {
    const ensureSignatureChain = vi.fn().mockResolvedValue({ ok: true });
    const attempt = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "chain mismatch" })
      .mockResolvedValueOnce({ ok: true });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "mainnet",
      ensureSignatureChain,
      attempt
    });
    expect(res).toEqual({ ok: true, retriedWithChainSwitch: true });
    expect(ensureSignatureChain).toHaveBeenCalledWith("mainnet");
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("surfaces combined error when chain switch fails after sign failure", async () => {
    const ensureSignatureChain = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "[!] Wallet switch failed." });
    const attempt = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "chain mismatch" });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/chain mismatch/);
      expect(res.error).toMatch(/Wallet switch failed/);
    }
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});

describe("formatHlConnectStickyError (#262 Soft Design A/B)", () => {
  it("Soft-nice Cancel Soft-copy only for confident cancel Soft-phrases", () => {
    expect(isHlConnectUserCancelled("User denied message signature.")).toBe(true);
    expect(isHlConnectUserCancelled("Request cancelled by the user")).toBe(true);
    expect(isHlConnectUserCancelled("User rejected the request.")).toBe(false);
    expect(formatHlConnectStickyError("User denied message signature.")).toBe(
      HL_CONNECT_USER_CANCELLED
    );
    expect(formatHlConnectStickyError("cancelled by user")).toBe(
      HL_CONNECT_USER_CANCELLED
    );
    expect(HL_CONNECT_USER_CANCELLED).toMatch(/cancel/i);
    expect(HL_CONNECT_USER_CANCELLED).not.toMatch(/user rejected/i);
  });

  it("Approve Soft-failure Soft-maps WC/viem reject Soft-string to Soft-fail Connect failed", () => {
    // Soft ACK #262 Lock A: Approve typed-data → sticky must NOT Soft-show Soft-user Soft-reject.
    const sticky = formatHlConnectStickyError("User rejected the request.");
    expect(sticky).toBe(HL_CONNECT_FAILED);
    expect(sticky).not.toMatch(/user rejected|rejected the request|cancelled|canceled|denied/i);
    expect(formatHlConnectStickyError("Transaction rejected by user.")).toBe(
      HL_CONNECT_FAILED
    );
    // Soft ACK #262 rework Soft Design A: chain chain phrase wins over reject Soft-noise.
    expect(
      formatHlConnectStickyError(
        "chain mismatch (User rejected the request.)"
      )
    ).toBe(HL_CONNECT_CHAIN_MISMATCH);
  });

  it("Soft-maps non-reject Soft-failures to distinct Soft-fail Soft-copy", () => {
    expect(formatHlConnectStickyError("Must deposit before performing actions.")).toMatch(
      /deposit/i
    );
    expect(formatHlConnectStickyError("Must deposit before performing actions.")).not.toMatch(
      /user rejected|cancelled|canceled|denied/i
    );
    expect(
      formatHlConnectStickyError(
        "Signature was signed by 0xabc, not the connected account 0xdef."
      )
    ).toMatch(/signer/i);
    expect(
      formatHlConnectStickyError("approveAgent signature rejected.")
    ).toBe(HL_CONNECT_FAILED);
    expect(formatHlConnectStickyError("Hyperliquid /exchange HTTP 500")).toMatch(
      /exchange/i
    );
    expect(formatHlConnectStickyError("session expired")).toBe(HL_CONNECT_FAILED);
    expect(formatHlConnectStickyError("")).toBe(HL_CONNECT_FAILED);
    expect(formatHlConnectStickyError(null)).toBe(HL_CONNECT_FAILED);
  });

  it("never Soft-surfaces raw provider reject Soft-verbatim on sticky", () => {
    const samples = [
      "User rejected the request.",
      "user rejected",
      "MetaMask Tx Signature: User denied message signature.",
      "approveAgent signature rejected.",
      "Exchange rejected the action."
    ];
    for (const s of samples) {
      const out = formatHlConnectStickyError(s);
      expect(out).not.toMatch(/user rejected the request/i);
      expect(out).not.toBe(s);
    }
  });
});


describe("formatHlConnectStickyError coverage edges (#262)", () => {
  it("handles null/empty classifiers and Soft-map Soft-edges", () => {
    expect(isWalletUserRejected(null)).toBe(false);
    expect(isWalletUserRejected(undefined)).toBe(false);
    expect(isWalletUserRejected("")).toBe(false);
    expect(isHlConnectUserCancelled(null)).toBe(false);
    expect(isHlConnectUserCancelled(undefined)).toBe(false);
    expect(isHlConnectUserCancelled("")).toBe(false);
  });

  it("Soft-maps cancel-adjacent Soft-noise, agent Soft-register Soft-fail, Soft-opaque Soft-reject Soft-leftovers", () => {
    expect(formatHlConnectStickyError("signature denied by wallet")).toBe(
      HL_CONNECT_FAILED
    );
    expect(
      formatHlConnectStickyError(
        "Agent approval returned ok but 0xabc is not listed as an approved agent."
      )
    ).toMatch(/Agent not registered/i);
    expect(formatHlConnectStickyError("unified account mode restricted")).toMatch(
      /Agent not registered/i
    );
    // leftover Soft-reject Soft-word without Soft-user Soft-rejected Soft-phrase
    expect(formatHlConnectStickyError("action reject code 42")).toBe(HL_CONNECT_FAILED);
    // long Soft-opaque Soft-line
    const long = "x".repeat(130);
    expect(formatHlConnectStickyError(long)).toBe(HL_CONNECT_FAILED);
    // short Soft-opaque Soft-passthrough
    expect(formatHlConnectStickyError("Temporary glitch")).toBe("Temporary glitch");
    expect(formatHlConnectStickyError("line1\nline2")).toBe("line1");
  });

  it("second attempt Soft-failure after chain Soft-retry Soft-surfaces Soft-second Soft-error", async () => {
    const ensureSignatureChain = vi.fn().mockResolvedValue({ ok: true });
    const attempt = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "chain mismatch" })
      .mockResolvedValueOnce({ ok: false, error: "still chain mismatch" });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt
    });
    expect(res.ok).toBe(false);
    // Soft ACK #264 Soft Design A: Soft-align Soft-exhausted Soft-+ Soft-chain Soft-mismatch Soft-→ Soft-SESSION_STALE Soft-. Soft-
    if (!res.ok) expect(res.error).toBe(HL_CONNECT_SESSION_STALE);
    expect(res.retriedWithChainSwitch).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});


describe("Soft ACK #262 rework OneKey chain mismatch", () => {
  const ONEKEY_VIEM =
    'Provided chainId "421614" must match the active chainId "1"';

  it("detects OneKey/viem chain mismatch and retries Soft-align once", async () => {
    expect(isHlConnectChainMismatch(ONEKEY_VIEM)).toBe(true);
    expect(isHlConnectChainMismatch(null)).toBe(false);
    expect(isHlConnectUserCancelled(ONEKEY_VIEM)).toBe(false);
    expect(isWalletUserRejected(ONEKEY_VIEM)).toBe(false);
    expect(shouldRetryHlUserSignedWithChainSwitch(ONEKEY_VIEM)).toBe(true);

    const ensureSignatureChain = vi.fn().mockResolvedValue({ ok: true });
    const attempt = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: ONEKEY_VIEM })
      .mockResolvedValueOnce({ ok: true });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "mainnet",
      ensureSignatureChain,
      attempt
    });
    expect(res).toEqual({ ok: true, retriedWithChainSwitch: true });
    expect(ensureSignatureChain).toHaveBeenCalledWith("mainnet");
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("Soft-nice sticky Soft-fail for chain mismatch (not user reject)", () => {
    const sticky = formatHlConnectStickyError(ONEKEY_VIEM);
    expect(sticky).toBe(HL_CONNECT_CHAIN_MISMATCH);
    expect(sticky).not.toMatch(/user rejected|cancelled|canceled|denied/i);
    expect(sticky).toMatch(/chain|session|mismatch|Arbitrum Sepolia/i);
    expect(
      formatHlConnectStickyError(
        `${ONEKEY_VIEM} ([!] Wallet is on ETH — switch to ARB SEP was rejected or failed. Tx not sent.)`
      )
    ).toBe(HL_CONNECT_CHAIN_MISMATCH);
    expect(formatHlConnectStickyError("Wrong network — switch to Arbitrum")).toBe(
      HL_CONNECT_CHAIN_MISMATCH
    );
    // Soft-nice Cancel still wins when confident.
    expect(formatHlConnectStickyError("User denied message signature.")).toBe(
      HL_CONNECT_USER_CANCELLED
    );
    // Soft-map Approve Soft-fail holds.
    expect(formatHlConnectStickyError("User rejected the request.")).toBe(
      HL_CONNECT_FAILED
    );
  });

  it("surfaces Soft-nice chain Soft-fail when Soft-align fails after OneKey mismatch", async () => {
    const ensureSignatureChain = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        error:
          "[!] Wallet is on ETH — switch to ARB SEP was rejected or failed. Tx not sent."
      });
    const attempt = vi.fn().mockResolvedValue({ ok: false, error: ONEKEY_VIEM });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(formatHlConnectStickyError(res.error)).toBe(HL_CONNECT_CHAIN_MISMATCH);
      expect(formatHlConnectStickyError(res.error)).not.toMatch(
        /user rejected|cancelled|canceled|denied/i
      );
    }
    expect(res.retriedWithChainSwitch).toBe(false);
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});


describe("Soft ACK #264 Soft-align Soft-verify + Soft-session Soft-stale", () => {
  const ONEKEY_VIEM =
    'Provided chainId "421614" must match the active chainId "1"';
  const TARGET = 421614; // 0x66eee

  it("exports Soft-nice Soft-session Soft-stale Soft-copy + Soft-Switch Soft-wallet Soft-CTA", () => {
    expect(HL_CONNECT_SESSION_STALE).toMatch(/session stale/i);
    expect(HL_CONNECT_SESSION_STALE).toMatch(/switch wallet|reconnect/i);
    expect(HL_CONNECT_SESSION_STALE).not.toMatch(/Arbitrum Sepolia/i);
    expect(HL_CONNECT_SWITCH_WALLET_CTA).toMatch(/switch wallet/i);
    expect(isHlConnectSessionStale(HL_CONNECT_SESSION_STALE)).toBe(true);
    expect(isHlConnectSessionStale(ONEKEY_VIEM)).toBe(false);
    expect(isHlConnectSessionStale(null)).toBe(false);
  });

  it("Soft-nice sticky Soft-maps Soft-align Soft-exhausted Soft-chain Soft-mismatch Soft-to Soft-session Soft-stale", () => {
    expect(
      formatHlConnectStickyError(ONEKEY_VIEM, { retriedWithChainSwitch: true })
    ).toBe(HL_CONNECT_SESSION_STALE);
    expect(
      formatHlConnectStickyError(ONEKEY_VIEM, {
        walletAlreadyOnSignatureChain: true
      })
    ).toBe(HL_CONNECT_SESSION_STALE);
    // Soft-Without Soft-opts Soft-: Soft-first Soft-surface Soft-still Soft-Soft-nice Soft-chain Soft-mismatch Soft-. Soft-
    expect(formatHlConnectStickyError(ONEKEY_VIEM)).toBe(HL_CONNECT_CHAIN_MISMATCH);
    expect(formatHlConnectStickyError(HL_CONNECT_SESSION_STALE)).toBe(
      HL_CONNECT_SESSION_STALE
    );
    // Soft-map Soft-Approve Soft-fail Soft-+ Soft-nice Soft-Cancel Soft-hold Soft-. Soft-
    expect(formatHlConnectStickyError("User rejected the request.")).toBe(
      HL_CONNECT_FAILED
    );
    expect(formatHlConnectStickyError("User denied message signature.")).toBe(
      HL_CONNECT_USER_CANCELLED
    );
  });

  it("runHl Soft-rewrites Soft-second Soft-chain Soft-mismatch Soft-to Soft-SESSION_STALE Soft-after Soft-align Soft-ok Soft-", async () => {
    const ensureSignatureChain = vi.fn().mockResolvedValue({ ok: true });
    const attempt = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: ONEKEY_VIEM })
      .mockResolvedValueOnce({ ok: false, error: ONEKEY_VIEM });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt,
      getWalletChainId: () => TARGET,
      signatureChainId: TARGET
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe(HL_CONNECT_SESSION_STALE);
      expect(formatHlConnectStickyError(res.error, {
        retriedWithChainSwitch: res.retriedWithChainSwitch,
        walletAlreadyOnSignatureChain: true
      })).toBe(HL_CONNECT_SESSION_STALE);
      expect(formatHlConnectStickyError(res.error)).not.toMatch(/Arbitrum Sepolia/i);
      expect(formatHlConnectStickyError(res.error)).not.toMatch(
        /user rejected|cancelled|canceled|denied/i
      );
    }
    expect(res.retriedWithChainSwitch).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("runHl Soft-maps Soft-align Soft-SESSION_STALE Soft-directly Soft-", async () => {
    const ensureSignatureChain = vi
      .fn()
      .mockResolvedValue({ ok: false, error: HL_CONNECT_SESSION_STALE });
    const attempt = vi.fn().mockResolvedValue({ ok: false, error: ONEKEY_VIEM });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "mainnet",
      ensureSignatureChain,
      attempt,
      getWalletChainId: () => TARGET,
      signatureChainId: TARGET
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe(HL_CONNECT_SESSION_STALE);
    expect(res.retriedWithChainSwitch).toBe(false);
  });

  it("shouldRetry Soft-skips Soft-SESSION_STALE Soft-(Soft-no Soft-third Soft-align Soft-) Soft-", () => {
    expect(shouldRetryHlUserSignedWithChainSwitch(HL_CONNECT_SESSION_STALE)).toBe(
      false
    );
  });

  it("alignHlSignatureChain Soft-ok Soft-when Soft-probe Soft-confirms Soft-target Soft-", async () => {
    const switchChainAsync = vi.fn();
    const res = await alignHlSignatureChain({
      targetChainId: TARGET,
      walletChainId: TARGET,
      switchChainAsync,
      readActiveChainId: async () => TARGET
    });
    expect(res).toEqual({ ok: true });
    expect(switchChainAsync).not.toHaveBeenCalled();
  });

  it("alignHlSignatureChain Soft-forces Soft-switch Soft-when Soft-wagmi Soft-on Soft-target Soft-but Soft-probe Soft-stale Soft-", async () => {
    const switchChainAsync = vi.fn().mockResolvedValue(undefined);
    let probe = 1;
    const res = await alignHlSignatureChain({
      targetChainId: TARGET,
      walletChainId: TARGET,
      switchChainAsync,
      readActiveChainId: async () => probe
    });
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: TARGET });
    // Soft-Post Soft-switch Soft-probe Soft-still Soft-stale Soft-→ Soft-SESSION_STALE Soft-
    expect(res).toEqual({ ok: false, error: HL_CONNECT_SESSION_STALE });
  });

  it("alignHlSignatureChain Soft-post Soft-verify Soft-ok Soft-after Soft-switch Soft-refreshes Soft-probe Soft-", async () => {
    const switchChainAsync = vi.fn().mockImplementation(async () => {
      probe = TARGET;
    });
    let probe: number = 1;
    const res = await alignHlSignatureChain({
      targetChainId: TARGET,
      walletChainId: 1,
      switchChainAsync,
      readActiveChainId: async () => probe
    });
    expect(res).toEqual({ ok: true });
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: TARGET });
  });

  it("alignHlSignatureChain Soft-Soft-nice Soft-SESSION_STALE Soft-when Soft-switch Soft-rejected Soft-but Soft-wagmi Soft-already Soft-on Soft-target Soft-", async () => {
    const switchChainAsync = vi
      .fn()
      .mockRejectedValue(new Error("User rejected the request."));
    const res = await alignHlSignatureChain({
      targetChainId: TARGET,
      walletChainId: TARGET,
      switchChainAsync,
      readActiveChainId: async () => 1
    });
    expect(res).toEqual({ ok: false, error: HL_CONNECT_SESSION_STALE });
  });

  it("alignHlSignatureChain Soft-without Soft-probe Soft-still Soft-forces Soft-switch Soft-then Soft-ok Soft-", async () => {
    const switchChainAsync = vi.fn().mockResolvedValue(undefined);
    const res = await alignHlSignatureChain({
      targetChainId: TARGET,
      walletChainId: TARGET,
      switchChainAsync
    });
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: TARGET });
    expect(res).toEqual({ ok: true });
  });

  it("sign-first Soft-holds Soft-— Soft-no Soft-align Soft-when Soft-first Soft-attempt Soft-ok Soft-", async () => {
    const ensureSignatureChain = vi.fn();
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt: async () => ({ ok: true }),
      getWalletChainId: () => TARGET,
      signatureChainId: TARGET
    });
    expect(res).toEqual({ ok: true, retriedWithChainSwitch: false });
    expect(ensureSignatureChain).not.toHaveBeenCalled();
  });

  it("alignHl Soft-surfaces Soft-switch Soft-fail Soft-when Soft-not Soft-already Soft-on Soft-target Soft-", async () => {
    const switchChainAsync = vi
      .fn()
      .mockRejectedValue(new Error("User rejected the request."));
    const res = await alignHlSignatureChain({
      targetChainId: TARGET,
      walletChainId: 1,
      switchChainAsync,
      readActiveChainId: async () => 1
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/Wallet switch to 421614/);
      expect(res.error).not.toBe(HL_CONNECT_SESSION_STALE);
    }
  });

  it("runHl Soft-maps Soft-align Soft-fail Soft-+ Soft-wagmi Soft-on Soft-target Soft-to Soft-SESSION_STALE Soft-", async () => {
    const ensureSignatureChain = vi.fn().mockResolvedValue({
      ok: false,
      error: "[!] Wallet switch to 421614 was rejected or failed. Tx not sent."
    });
    const attempt = vi.fn().mockResolvedValue({ ok: false, error: ONEKEY_VIEM });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt,
      getWalletChainId: () => TARGET,
      signatureChainId: TARGET
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe(HL_CONNECT_SESSION_STALE);
    expect(res.retriedWithChainSwitch).toBe(false);
  });
});


describe("raceHlUserSignedAttemptWithCancelDismiss (#266)", () => {
  it("exports Soft-cancel Soft-dismiss Soft-grace Soft-+ Soft-confident Soft-Cancel Soft-error Soft-", () => {
    expect(HL_CONNECT_CANCEL_DISMISS_GRACE_MS).toBe(1_500);
    expect(isHlConnectUserCancelled(HL_CONNECT_CANCEL_DISMISS_ERROR)).toBe(true);
    expect(formatHlConnectStickyError(HL_CONNECT_CANCEL_DISMISS_ERROR)).toBe(
      HL_CONNECT_USER_CANCELLED
    );
  });

  it("resolves Soft-attempt Soft-when Soft-sign Soft-settles Soft-before Soft-grace Soft-", async () => {
    const listeners = new Map<string, Set<() => void>>();
    const doc = {
      hidden: false,
      addEventListener: (type: string, fn: () => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: () => void) => {
        listeners.get(type)?.delete(fn);
      }
    };
    const res = await raceHlUserSignedAttemptWithCancelDismiss({
      attempt: async () => ({ ok: true }),
      graceMs: 50,
      getDocument: () => doc,
      getWindow: () => null
    });
    expect(res).toEqual({ ok: true });
  });

  it("Soft-settles Soft-nice Soft-Cancel Soft-after Soft-hidden Soft-→ Soft-visible Soft-+ Soft-grace Soft-while Soft-pending Soft-", async () => {
    vi.useFakeTimers();
    try {
      const listeners = new Map<string, Set<() => void>>();
      const doc = {
        hidden: false,
        addEventListener: (type: string, fn: () => void) => {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(fn);
        },
        removeEventListener: (type: string, fn: () => void) => {
          listeners.get(type)?.delete(fn);
        }
      };
      const fire = (type: string) => {
        for (const fn of listeners.get(type) ?? []) fn();
      };

      let resolveAttempt!: (v: { ok: true } | { ok: false; error: string }) => void;
      const pending = new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
        resolveAttempt = resolve;
      });

      const raced = raceHlUserSignedAttemptWithCancelDismiss({
        attempt: () => pending,
        graceMs: 100,
        getDocument: () => doc,
        getWindow: () => null
      });

      // Soft-Deep Soft-link Soft-out Soft-to Soft-OneKey Soft-. Soft-
      doc.hidden = true;
      fire("visibilitychange");
      // Soft-Cancel Soft-→ Soft-return Soft-to Soft-Safari Soft-. Soft-
      doc.hidden = false;
      fire("visibilitychange");

      // Soft-Still Soft-pending Soft-through Soft-grace Soft-→ Soft-Soft-nice Soft-Cancel Soft-. Soft-
      await vi.advanceTimersByTimeAsync(100);
      const res = await raced;
      expect(res).toEqual({ ok: false, error: HL_CONNECT_CANCEL_DISMISS_ERROR });
      expect(isHlConnectUserCancelled(res.ok ? null : res.error)).toBe(true);

      // Soft-Late Soft-settle Soft-must Soft-not Soft-throw Soft-(Soft-swallowed Soft-) Soft-. Soft-
      resolveAttempt({ ok: false, error: "User rejected the request." });
      await vi.advanceTimersByTimeAsync(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does Soft-not Soft-Soft-cancel Soft-when Soft-never Soft-hidden Soft-(Soft-true Soft-hang Soft-keeps Soft-pending Soft-) Soft-", async () => {
    vi.useFakeTimers();
    try {
      const listeners = new Map<string, Set<() => void>>();
      const doc = {
        hidden: false,
        addEventListener: (type: string, fn: () => void) => {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(fn);
        },
        removeEventListener: (type: string, fn: () => void) => {
          listeners.get(type)?.delete(fn);
        }
      };
      const fire = (type: string) => {
        for (const fn of listeners.get(type) ?? []) fn();
      };

      let resolveAttempt!: (v: { ok: true }) => void;
      const pending = new Promise<{ ok: true }>((resolve) => {
        resolveAttempt = resolve;
      });

      let settled: unknown = null;
      const raced = raceHlUserSignedAttemptWithCancelDismiss({
        attempt: () => pending,
        graceMs: 100,
        getDocument: () => doc,
        getWindow: () => null
      }).then((r) => {
        settled = r;
        return r;
      });

      // Soft-Focus Soft-without Soft-prior Soft-hide Soft-must Soft-not Soft-Soft-arm Soft-Cancel Soft-. Soft-
      fire("visibilitychange");
      await vi.advanceTimersByTimeAsync(500);
      expect(settled).toBeNull();

      resolveAttempt({ ok: true });
      const res = await raced;
      expect(res).toEqual({ ok: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it("Approve Soft-wins Soft-race Soft-when Soft-sig Soft-arrives Soft-within Soft-grace Soft-after Soft-return Soft-", async () => {
    vi.useFakeTimers();
    try {
      const listeners = new Map<string, Set<() => void>>();
      const doc = {
        hidden: false,
        addEventListener: (type: string, fn: () => void) => {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(fn);
        },
        removeEventListener: (type: string, fn: () => void) => {
          listeners.get(type)?.delete(fn);
        }
      };
      const fire = (type: string) => {
        for (const fn of listeners.get(type) ?? []) fn();
      };

      let resolveAttempt!: (v: { ok: true }) => void;
      const pending = new Promise<{ ok: true }>((resolve) => {
        resolveAttempt = resolve;
      });

      const raced = raceHlUserSignedAttemptWithCancelDismiss({
        attempt: () => pending,
        graceMs: 200,
        getDocument: () => doc,
        getWindow: () => null
      });

      doc.hidden = true;
      fire("visibilitychange");
      doc.hidden = false;
      fire("visibilitychange");

      await vi.advanceTimersByTimeAsync(50);
      resolveAttempt({ ok: true });
      const res = await raced;
      expect(res).toEqual({ ok: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it("Soft-arms Soft-Cancel Soft-via Soft-window Soft-focus Soft-/ Soft-pageshow Soft-after Soft-hide Soft-", async () => {
    vi.useFakeTimers();
    try {
      const docListeners = new Map<string, Set<() => void>>();
      const winListeners = new Map<string, Set<() => void>>();
      const doc = {
        hidden: false,
        addEventListener: (type: string, fn: () => void) => {
          if (!docListeners.has(type)) docListeners.set(type, new Set());
          docListeners.get(type)!.add(fn);
        },
        removeEventListener: (type: string, fn: () => void) => {
          docListeners.get(type)?.delete(fn);
        }
      };
      const win = {
        addEventListener: (type: string, fn: () => void) => {
          if (!winListeners.has(type)) winListeners.set(type, new Set());
          winListeners.get(type)!.add(fn);
        },
        removeEventListener: (type: string, fn: () => void) => {
          winListeners.get(type)?.delete(fn);
        }
      };
      const fireDoc = (type: string) => {
        for (const fn of docListeners.get(type) ?? []) fn();
      };
      const fireWin = (type: string) => {
        for (const fn of winListeners.get(type) ?? []) fn();
      };

      const pending = new Promise<{ ok: true }>(() => {
        /* Soft-never Soft-settles Soft-*/
      });

      const raced = raceHlUserSignedAttemptWithCancelDismiss({
        attempt: () => pending,
        graceMs: 80,
        getDocument: () => doc,
        getWindow: () => win
      });

      doc.hidden = true;
      fireDoc("visibilitychange");
      doc.hidden = false;
      // Soft-pageshow Soft-/ Soft-focus Soft-without Soft-another Soft-visibilitychange Soft-. Soft-
      fireWin("pageshow");

      await vi.advanceTimersByTimeAsync(80);
      const res = await raced;
      expect(res).toEqual({ ok: false, error: HL_CONNECT_CANCEL_DISMISS_ERROR });
    } finally {
      vi.useRealTimers();
    }
  });

  it("Soft-maps Soft-thrown Soft-attempt Soft-errors Soft-to Soft-ok Soft-false Soft-", async () => {
    const doc = {
      hidden: false,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    const res = await raceHlUserSignedAttemptWithCancelDismiss({
      attempt: async () => {
        throw new Error("User denied message signature.");
      },
      getDocument: () => doc,
      getWindow: () => null
    });
    expect(res).toEqual({
      ok: false,
      error: "User denied message signature."
    });
    expect(isHlConnectUserCancelled(res.ok ? null : res.error)).toBe(true);

    const res2 = await raceHlUserSignedAttemptWithCancelDismiss({
      attempt: async () => {
        throw "string-reject";
      },
      getDocument: () => doc,
      getWindow: () => null
    });
    expect(res2).toEqual({ ok: false, error: "string-reject" });

    const res3 = await raceHlUserSignedAttemptWithCancelDismiss({
      attempt: async () => {
        throw 42;
      },
      getDocument: () => doc,
      getWindow: () => null
    });
    expect(res3).toEqual({ ok: false, error: "42" });
  });

  it("falls Soft-through Soft-to Soft-attempt Soft-when Soft-no Soft-document Soft-", async () => {
    const res = await raceHlUserSignedAttemptWithCancelDismiss({
      attempt: async () => ({ ok: true }),
      getDocument: () => null,
      getWindow: () => null
    });
    expect(res).toEqual({ ok: true });
  });
});
