/**
 * @file userSignedConnect.test.ts
 * @description Soft ACK #260/#262 — sign-first, Soft sticky Soft-fail Soft-map, chain retry
 */
import { describe, expect, it, vi } from "vitest";
import {
  HL_CONNECT_BUSY_TIMEOUT_MS,
  HL_CONNECT_FAILED,
  HL_CONNECT_TIMEOUT_COPY,
  HL_CONNECT_USER_CANCELLED,
  formatHlConnectStickyError,
  isHlConnectUserCancelled,
  isWalletUserRejected,
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
    expect(
      formatHlConnectStickyError(
        "chain mismatch (User rejected the request.)"
      )
    ).toBe(HL_CONNECT_FAILED);
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
    if (!res.ok) expect(res.error).toBe("still chain mismatch");
    expect(res.retriedWithChainSwitch).toBe(true);
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});
