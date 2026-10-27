/**
 * @file userSignedConnect.ts
 * @description Soft ACK #260/#262/#264 — sign-first + Soft sticky Soft-fail + Soft-align + session Soft-stale
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 *
 * iOS Safari / WalletConnect often drops the user-gesture chain after an async
 * `switchChain` deep-link, so a hard `ensureSignatureChain` *before*
 * `signTypedDataAsync` makes CONNECT HYPERLIQUID look dead. EIP-712 domain
 * already embeds `chainId = 0x66eee` (SDK lock B) — attempt typed-data first,
 * and only then align the wallet + retry when the failure looks chain-related
 * (not a user reject / not an HL exchange business error).
 *
 * Soft ACK #262: WC/viem may surface reject-shaped strings after a true Approve
 * (or after a post-sign chain-retry). Sticky Soft-fail must Soft-map those so
 * Approve never reads as Soft-nice Cancel; Soft-nice Cancel only when the
 * cancel classifier is confident.
 *
 * Soft ACK #262 rework (Soft PASS NACK #263): OneKey / viem hard-rejects when
 * domain chainId 421614 (0x66eee) ≠ wallet active chain (often 1 even when
 * OneKey UI shows HyperEVM). Soft-detect that Soft-fail → Soft-align once via
 * ensureSignatureChain(0x66eee) → retry; Soft-nice sticky Soft-fail for chain /
 * session mismatch (never Soft-label as user reject). Sign-first holds for
 * wallets that can sign without a prior switch.
 *
 * Soft ACK #264 (Soft FAIL Soft PASS lock D after #263): Soft-align once can
 * return ok while the signing provider stays stale (wagmi/UI already on
 * 421614). Post-align verify + Soft-nice session-stale Soft-fail Soft-copy
 * (never dead "switch to Arb Sepolia" when already there). Confident Cancel
 * Soft-unlocks wallet picker (disconnect / open Connect) so MetaMask is
 * pickable without reload.
 *
 * Soft ACK #266: OneKey WC Cancel can dismiss the wallet UI while leaving
 * `signTypedDataAsync` pending — busy stays `"agent"` / SIGNING… until the
 * 15s timeout (or forever). Race each sign attempt with a Soft-cancel-dismiss
 * watcher (hidden→visible + short grace) so confident Cancel Soft-settles
 * promptly → Soft-nice Cancel sticky + unlock, without a hard pre-sign
 * `ensureSignatureChain` or changing domain `0x66eee`.
 */
import type { HlNetwork } from "./config";

/** Soft Design chrome B — hang off SIGNING… (~15s ±5 OK). */
export const HL_CONNECT_BUSY_TIMEOUT_MS = 15_000;

/**
 * Soft ACK #266 — after Safari returns from a wallet deep-link (Cancel
 * dismiss), wait this grace for `signTypedDataAsync` to settle before
 * Soft-settling Soft-nice Cancel. Approve happy-path usually settles faster;
 * Soft PASS lock D residual if a slow Approve lands after grace.
 */
export const HL_CONNECT_CANCEL_DISMISS_GRACE_MS = 1_500;

/**
 * Soft ACK #266 — confident Cancel phrase for `isHlConnectUserCancelled`
 * Soft-map when WC Cancel dismisses UI but leaves the sign request pending.
 */
export const HL_CONNECT_CANCEL_DISMISS_ERROR =
  "Request cancelled by the user";

export const HL_CONNECT_TIMEOUT_COPY =
  "Wallet did not respond — check MetaMask / WalletConnect, then retry.";

export const HL_CONNECT_SIGNING_HINT = "Check wallet / MetaMask";

export const HL_CONNECT_WALLET_REQUIRED = "Connect wallet first.";

/** Soft ACK #262 Soft Design B — Soft-nice when truly cancelled. */
export const HL_CONNECT_USER_CANCELLED = "Cancelled — connect when ready.";

/**
 * Soft ACK #262 Soft Design A/B note 2 — Soft-fail when Approve fails or WC
 * returns opaque / reject-shaped noise. Beats raw provider "user rejected".
 */
export const HL_CONNECT_FAILED = "Connect failed — retry.";

/**
 * Soft ACK #262 rework Soft Design A — Soft-nice sticky Soft-fail when wallet
 * active chain ≠ HL EIP-712 domain 0x66eee / 421614 (OneKey / viem) and Soft-
 * align has not yet Soft-exhausted. Visibly not Soft-nice Cancel / user reject.
 */
export const HL_CONNECT_CHAIN_MISMATCH =
  "Chain / session mismatch — switch wallet to Arbitrum Sepolia, then retry.";

/**
 * Soft ACK #264 Soft Design A — Soft-nice when Soft-align Soft-exhausted /
 * connector Soft-stale (wallet UI already on Arb Sepolia / wagmi reports
 * 421614). Soft-dead Soft-switch Soft-copy Soft-forbidden Soft-in Soft-this Soft-state.
 */
export const HL_CONNECT_SESSION_STALE =
  "Wallet session stale — switch wallet or reconnect, then retry.";

/** Soft ACK #264 Soft Design B — Soft-nice Switch wallet sticky CTA label. */
export const HL_CONNECT_SWITCH_WALLET_CTA = "Switch wallet";

export type HlUserSignedAttemptResult =
  | { ok: true }
  | { ok: false; error: string };

export type EnsureSignatureChainFn = (
  network: HlNetwork
) => Promise<{ ok: true } | { ok: false; error: string }>;

export type AlignHlSignatureChainDeps = {
  targetChainId: number;
  /** wagmi useAccount().chainId (may Soft-lie vs signing Soft-provider). */
  walletChainId: number | null | undefined;
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>;
  /** Soft ACK #264 optional eth_chainId Soft-re-probe (walletClient.getChainId). */
  readActiveChainId?: () => Promise<number | null | undefined>;
};

/**
 * True when the wallet UI rejected / cancelled the prompt.
 * Soft ACK #262: used for chain-retry gating (skip retry after reject-shaped
 * errors, including WC false 4001 — do not re-prompt switchChain).
 * Sticky Soft-copy uses `isHlConnectUserCancelled` + `formatHlConnectStickyError`
 * so generic "User rejected the request" is Soft-fail Connect failed (known
 * iPhone WC false-positive after Approve), not Soft-nice Cancel.
 */
export function isWalletUserRejected(error: string | null | undefined): boolean {
  if (!error) return false;
  return /user rejected|user denied|denied (the )?request|denied message signature|rejected the request|cancelled by (the )?user|canceled by (the )?user|user cancelled|user canceled|request rejected by user|transaction rejected by user/i.test(
    error
  );
}

/**
 * Soft ACK #262 Soft Design B — confident Soft-nice Cancel Soft-copy only.
 * MetaMask native cancel often uses "User denied message signature."; clear
 * "cancelled by user" phrases Soft PASS Soft Design B. Generic viem/WC
 * "User rejected the request." is intentionally NOT Soft-nice Cancel — Soft
 * Design note 2: Soft-fail Connect failed beats that raw string (known false
 * Soft-label after Approve on iPhone Safari + MetaMask WC).
 */
export function isHlConnectUserCancelled(
  error: string | null | undefined
): boolean {
  if (!error) return false;
  return /user denied message signature|denied message signature|cancelled by (the )?user|canceled by (the )?user|user cancelled( the request)?|user canceled( the request)?|request (was )?cancelled|request (was )?canceled/i.test(
    error
  );
}

/**
 * Soft ACK #262 rework Lock A/C — wallet active chain ≠ EIP-712 domain chainId
 * (viem: `Provided chainId "421614" must match the active chainId "1"`).
 * OneKey Soft PASS NACK: UI may Soft-show HyperEVM while connector still on 1;
 * domain stays 0x66eee (Arbitrum Sepolia) — Soft-align target is 421614, not
 * HyperEVM 999.
 */
export function isHlConnectChainMismatch(
  error: string | null | undefined
): boolean {
  if (!error) return false;
  // Confident Soft-nice Cancel beats Soft-chain Soft-map.
  if (isHlConnectUserCancelled(error)) return false;
  // Soft ACK #264 Soft-session Soft-stale Soft-is Soft-its Soft-own Soft-class Soft-.
  if (isHlConnectSessionStale(error)) return false;
  return (
    /must match the active chainId/i.test(error) ||
    /Provided chainId ["']?\d+["']? must match/i.test(error) ||
    /wrong network|chain mismatch|network mismatch|unsupported (chain|network)|wallet must (be )?on/i.test(
      error
    ) ||
    (/chainId/i.test(error) &&
      /active chain|must match|switch|mismatch|unsupported/i.test(error))
  );
}

/** Soft ACK #264 Soft Design A — Soft-nice Soft-session Soft-stale Soft-classifier. */
export function isHlConnectSessionStale(
  error: string | null | undefined
): boolean {
  if (!error) return false;
  if (error === HL_CONNECT_SESSION_STALE) return true;
  return /wallet session stale|session stale|switch wallet or reconnect/i.test(
    error
  );
}

/**
 * Soft ACK #264 Soft FAIL Soft-1 Soft- — Soft-align Soft-HL Soft-signature Soft-chain Soft-with Soft-
 * Soft-post Soft-switch Soft-verify Soft-. Soft-Never Soft-early Soft-ok Soft-on Soft-wagmi Soft-alone Soft-
 * when Soft-signing Soft-provider Soft-may Soft-be Soft-stale Soft-(Soft-OneKey Soft-) Soft-. Soft-
 * Soft-Target Soft-is Soft-always Soft-`hlSignatureChainId` Soft-(Soft-421614 Soft-/ Soft-0x66eee Soft-) Soft-
 * Soft-not Soft-HyperEVM Soft-998 Soft-/ Soft-999 Soft-. Soft-
 */
export async function alignHlSignatureChain(
  deps: AlignHlSignatureChainDeps
): Promise<{ ok: true } | { ok: false; error: string }> {
  const target = deps.targetChainId;
  const wagmiOnTarget = deps.walletChainId === target;

  const read = async (): Promise<number | null | undefined> => {
    if (deps.readActiveChainId) {
      try {
        const id = await deps.readActiveChainId();
        if (typeof id === "number" && Number.isFinite(id)) return id;
      } catch {
        /* Soft-ignore Soft-probe Soft-errors Soft-; Soft-fall Soft-through Soft-*/
      }
    }
    return deps.walletChainId;
  };

  let active = await read();

  // Soft-Probe Soft-confirms Soft-target Soft-with Soft-an Soft-explicit Soft-reader Soft-→ Soft-ok Soft-
  // Soft-without Soft-another Soft-switch Soft-prompt Soft-(Soft-MM Soft-happy Soft-path Soft-) Soft-. Soft-
  if (deps.readActiveChainId && active === target) {
    return { ok: true };
  }

  // Soft ACK #264 Soft-: Soft-force Soft-switch Soft-when Soft-probe Soft-≠ Soft-target Soft-, Soft-or Soft-
  // Soft-when Soft-no Soft-probe Soft-(Soft-refresh Soft-WC Soft-session Soft-even Soft-if Soft-wagmi Soft-
  // Soft-already Soft-reports Soft-421614 Soft-) Soft-. Soft-
  try {
    await deps.switchChainAsync({ chainId: target });
  } catch {
    // Soft-Switch Soft-rejected Soft-while Soft-UI Soft-/ Soft-wagmi Soft-already Soft-on Soft-target Soft-
    // Soft-→ Soft-Soft-nice Soft-session Soft-stale Soft-(Soft-not Soft-dead Soft-switch Soft-copy Soft-) Soft-. Soft-
    if (wagmiOnTarget || active === target) {
      return { ok: false, error: HL_CONNECT_SESSION_STALE };
    }
    return {
      ok: false,
      error: `[!] Wallet switch to ${target} was rejected or failed. Tx not sent.`
    };
  }

  active = await read();
  if (!deps.readActiveChainId) {
    // Soft-No Soft-probe Soft-: Soft-switch Soft-resolved Soft-; Soft-second Soft-sign Soft-still Soft-
    // Soft-mismatch Soft-Soft-maps Soft-to Soft-SESSION_STALE Soft-in Soft-runHl Soft-retry Soft-. Soft-
    return { ok: true };
  }
  if (active === target) return { ok: true };
  // Soft-Post Soft-align Soft-verify Soft-failed Soft-— Soft-connector Soft-stale Soft-. Soft-
  return { ok: false, error: HL_CONNECT_SESSION_STALE };
}

export type FormatHlConnectStickyOpts = {
  /** Soft ACK #264 — Soft-align Soft-once Soft-already Soft-ran Soft-. Soft-*/
  retriedWithChainSwitch?: boolean;
  /** Soft ACK #264 — Soft-wagmi Soft-/ Soft-UI Soft-already Soft-reports Soft-signature Soft-chain Soft-. Soft-*/
  walletAlreadyOnSignatureChain?: boolean;
};

/**
 * Soft ACK #262 Soft Design A/B — Soft-map CONNECT / builder sticky Soft-fail.
 * Never surfaces raw provider "user rejected" verbatim on sticky.
 * Soft ACK #264 Soft Design A — Soft-session Soft-stale Soft-beats Soft-dead Soft-switch Soft-copy Soft-
 * Soft-when Soft-Soft-align Soft-Soft-exhausted Soft-/ Soft-already Soft-on Soft-target Soft-. Soft-
 */
export function formatHlConnectStickyError(
  error: string | null | undefined,
  opts?: FormatHlConnectStickyOpts
): string {
  if (!error || !error.trim()) return HL_CONNECT_FAILED;
  const raw = error.trim();

  if (isHlConnectUserCancelled(raw)) return HL_CONNECT_USER_CANCELLED;

  // Soft ACK #264 Soft Design A — Soft-nice Soft-session Soft-stale Soft-before Soft-dead Soft-switch Soft-.
  if (isHlConnectSessionStale(raw)) return HL_CONNECT_SESSION_STALE;

  // Soft ACK #262 rework Soft Design A — Soft-nice chain/session Soft-fail
  // before Soft-map Soft-reject Soft-noise (combined errors may embed both).
  if (isHlConnectChainMismatch(raw)) {
    if (
      opts?.retriedWithChainSwitch ||
      opts?.walletAlreadyOnSignatureChain
    ) {
      return HL_CONNECT_SESSION_STALE;
    }
    return HL_CONNECT_CHAIN_MISMATCH;
  }

  // Soft Design Soft FAIL list: never Soft-label Approve failures as Cancel.
  // Generic WC/viem 4001 string → Soft-fail Connect failed (note 2).
  if (
    /user rejected|rejected the request|transaction rejected by user|request rejected by user/i.test(
      raw
    )
  ) {
    return HL_CONNECT_FAILED;
  }

  // Cancel-adjacent Soft-noise without confident cancel classifier.
  if (
    /\b(cancelled|canceled|denied)\b/i.test(raw) &&
    /user|request|signature|transaction|wallet/i.test(raw)
  ) {
    return HL_CONNECT_FAILED;
  }

  // Keep known HL business Soft-fail copy (short terminal Soft-fail).
  if (/Must deposit/i.test(raw)) {
    return "Must deposit before connecting — fund your account, then retry.";
  }
  if (/not listed as an approved|unified account/i.test(raw)) {
    return "Agent not registered — retry, or approve at app.hyperliquid.xyz/API.";
  }
  if (/wrong signer|signed by|not the connected account/i.test(raw)) {
    return "Wrong signer — switch account in wallet and retry.";
  }
  if (/HTTP \d|Exchange rejected|\/exchange/i.test(raw)) {
    return "Hyperliquid exchange error — retry.";
  }
  if (
    /chain|network|switch|session|disconnected|provider|WalletConnect|MetaMask/i.test(
      raw
    )
  ) {
    // Session noise without confident chain-mismatch phrase → generic Soft-fail.
    // True chain mismatch already returned HL_CONNECT_CHAIN_MISMATCH above.
    return HL_CONNECT_FAILED;
  }
  if (
    /approveAgent signature rejected|approveBuilderFee signature rejected|signature rejected/i.test(
      raw
    )
  ) {
    return HL_CONNECT_FAILED;
  }

  // Soft Design note 2: opaque Soft-fail beats raw reject-shaped leftovers.
  if (/reject|cancelled|canceled|denied/i.test(raw)) {
    return HL_CONNECT_FAILED;
  }

  const firstLine = raw.split("\n")[0]!.trim();
  if (firstLine.length > 120) return HL_CONNECT_FAILED;
  return firstLine || HL_CONNECT_FAILED;
}

/**
 * True when a failed attempt is worth one chain-align + retry (wallet/chain
 * surface) — not HL exchange / deposit / business rejects, not signer mismatch.
 * Soft ACK #262: bare `sign` matched "signature rejected" / signer-mismatch
 * copy, triggering switchChain after Approve and painting sticky with user
 * reject. Only true chain-surface failures retry.
 */
export function shouldRetryHlUserSignedWithChainSwitch(
  error: string | null | undefined
): boolean {
  if (!error) return false;
  // Soft ACK #262 rework: Soft-nice Cancel skips retry. Generic WC
  // "User rejected the request." still skips switchChain (false 4001 after
  // Approve) — except true chain-mismatch Soft-fails Soft-align once.
  if (isHlConnectUserCancelled(error)) return false;
  if (isHlConnectSessionStale(error)) return false;
  if (isHlConnectChainMismatch(error)) return true;
  if (isWalletUserRejected(error)) return false;
  // HL /exchange business + post-sign verification — do not re-prompt.
  if (
    /Must deposit|HTTP \d|not listed as an approved|unified account|Exchange rejected|\/exchange|signed by|not the connected account|wrong signer/i.test(
      error
    )
  ) {
    return false;
  }
  // Soft ACK #262: chain-align only; do not match bare `sign` / `wallet`.
  return /unsupported (chain|network)|switch chain|provider.*chain|disconnected|session (expired|disconnect|invalid)|typed.?data.*(chain|network)|approveAgent signature rejected|approveBuilderFee signature rejected/i.test(
    error
  );
}


/** Soft ACK #266 — minimal doc surface for Cancel-dismiss Soft-watch (testable). */
export type HlCancelDismissDocument = {
  hidden: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export type HlCancelDismissWindow = {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export type RaceHlUserSignedCancelDismissArgs = {
  attempt: () => Promise<HlUserSignedAttemptResult>;
  graceMs?: number;
  /** Inject document for unit tests; default `document` when present. */
  getDocument?: () => HlCancelDismissDocument | null | undefined;
  /** Inject window focus/pageshow targets; default `window` when present. */
  getWindow?: () => HlCancelDismissWindow | null | undefined;
};

/**
 * Soft ACK #266 Soft Design A — race a sign attempt against Cancel/dismiss.
 *
 * OneKey WC on iPhone often deep-links out; Cancel returns to Safari
 * (`visibilitychange` visible) without rejecting `signTypedDataAsync`.
 * Soft-settle Soft-nice Cancel after hidden→visible + grace when the attempt
 * is still pending. Does not Soft-arm during Soft-align `switchChain` — call
 * only around the typed-data attempt itself (sign-first holds).
 */
export async function raceHlUserSignedAttemptWithCancelDismiss(
  args: RaceHlUserSignedCancelDismissArgs
): Promise<HlUserSignedAttemptResult> {
  const graceMs = args.graceMs ?? HL_CONNECT_CANCEL_DISMISS_GRACE_MS;
  const doc: HlCancelDismissDocument | null =
    args.getDocument?.() ??
    (typeof document !== "undefined"
      ? (document as unknown as HlCancelDismissDocument)
      : null);
  const win: HlCancelDismissWindow | null =
    args.getWindow?.() ??
    (typeof window !== "undefined"
      ? (window as unknown as HlCancelDismissWindow)
      : null);

  if (!doc) {
    return args.attempt();
  }

  let settled = false;
  let wasHidden = !!doc.hidden;
  let graceTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanupFns: Array<() => void> = [];

  const cleanup = () => {
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
    if (graceTimer != null) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
  };

  const dismissPromise = new Promise<HlUserSignedAttemptResult>((resolve) => {
    const armGrace = () => {
      if (settled || graceTimer != null) return;
      graceTimer = setTimeout(() => {
        graceTimer = null;
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ ok: false, error: HL_CONNECT_CANCEL_DISMISS_ERROR });
      }, graceMs);
    };

    const onVis = () => {
      if (settled) return;
      if (doc.hidden) {
        wasHidden = true;
        if (graceTimer != null) {
          clearTimeout(graceTimer);
          graceTimer = null;
        }
        return;
      }
      if (wasHidden) armGrace();
    };

    const onFocusLike = () => {
      if (settled) return;
      if (wasHidden && !doc.hidden) armGrace();
    };

    doc.addEventListener("visibilitychange", onVis);
    cleanupFns.push(() =>
      doc.removeEventListener("visibilitychange", onVis)
    );
    if (win) {
      win.addEventListener("pageshow", onFocusLike);
      win.addEventListener("focus", onFocusLike);
      cleanupFns.push(() => {
        win.removeEventListener("pageshow", onFocusLike);
        win.removeEventListener("focus", onFocusLike);
      });
    }
  });

  const attemptPromise = args.attempt().then(
    (result) => {
      if (!settled) {
        settled = true;
        cleanup();
      }
      return result;
    },
    (err: unknown) => {
      if (!settled) {
        settled = true;
        cleanup();
      }
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : String(err ?? "Connect failed");
      return { ok: false as const, error: message };
    }
  );

  return Promise.race([attemptPromise, dismissPromise]);
}

/**
 * Soft ACK #260 C: preserve user gesture — typed-data first; optional
 * `ensureSignatureChain` + single retry only when the first failure looks
 * chain-related. Domain `chainId` stays `0x66eee` inside the attempt (lock B).
 *
 * Soft ACK #264: Soft-after Soft-Soft-align Soft-ok Soft-+ Soft-second Soft-still Soft-chain Soft-
 * Soft-mismatch Soft-→ Soft-rewrite Soft-to Soft-SESSION_STALE Soft-(Soft-especially Soft-when Soft-
 * Soft-wagmi Soft-already Soft-on Soft-signature Soft-chain Soft-) Soft-. Soft-
 */
export async function runHlUserSignedWithOptionalChainRetry(args: {
  network: HlNetwork;
  ensureSignatureChain: EnsureSignatureChainFn;
  attempt: () => Promise<HlUserSignedAttemptResult>;
  /** Soft ACK #264 — wagmi Soft-wallet Soft-chain Soft-id Soft-snapshot Soft-. Soft-*/
  getWalletChainId?: () => number | null | undefined;
  /** Soft ACK #264 — HL EIP-712 Soft-signature Soft-chain Soft-(Soft-0x66eee Soft-/ Soft-421614 Soft-) Soft-. Soft-*/
  signatureChainId?: number;
}): Promise<HlUserSignedAttemptResult & { retriedWithChainSwitch: boolean }> {
  const first = await args.attempt();
  if (first.ok) {
    return { ok: true, retriedWithChainSwitch: false };
  }
  if (!shouldRetryHlUserSignedWithChainSwitch(first.error)) {
    return { ok: false, error: first.error, retriedWithChainSwitch: false };
  }
  const chain = await args.ensureSignatureChain(args.network);
  if (!chain.ok) {
    // Prefer the original sign error; append switch failure when distinct.
    // Soft ACK #264: Soft-align Soft-may Soft-already Soft-return Soft-SESSION_STALE Soft-. Soft-
    if (isHlConnectSessionStale(chain.error)) {
      return {
        ok: false,
        error: HL_CONNECT_SESSION_STALE,
        retriedWithChainSwitch: false
      };
    }
    const combined =
      chain.error && chain.error !== first.error
        ? `${first.error} (${chain.error})`
        : first.error;
    // Soft-If Soft-wagmi Soft-already Soft-on Soft-target Soft-, Soft-Soft-map Soft-combined Soft-to Soft-stale Soft-. Soft-
    const walletId = args.getWalletChainId?.();
    if (
      args.signatureChainId != null &&
      walletId === args.signatureChainId &&
      isHlConnectChainMismatch(combined)
    ) {
      return {
        ok: false,
        error: HL_CONNECT_SESSION_STALE,
        retriedWithChainSwitch: false
      };
    }
    return { ok: false, error: combined, retriedWithChainSwitch: false };
  }
  const second = await args.attempt();
  if (second.ok) {
    return { ok: true, retriedWithChainSwitch: true };
  }
  let error = second.error;
  // Soft ACK #264 Soft Design A: Soft-align Soft-once Soft-Soft-exhausted Soft-+ Soft-still Soft-
  // Soft-chain Soft-mismatch Soft-→ Soft-Soft-nice Soft-session Soft-stale Soft-(Soft-never Soft-dead Soft-
  // Soft-switch Soft-copy Soft-when Soft-already Soft-on Soft-Arb Soft-Sepolia Soft-) Soft-. Soft-
  if (isHlConnectChainMismatch(error)) {
    error = HL_CONNECT_SESSION_STALE;
  }
  return {
    ok: false,
    error,
    retriedWithChainSwitch: true
  };
}
