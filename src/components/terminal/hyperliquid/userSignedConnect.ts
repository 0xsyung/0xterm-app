/**
 * @file userSignedConnect.ts
 * @description Soft ACK #260/#262 rework — sign-first + Soft sticky Soft-fail + OneKey chain-align
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
 */
import type { HlNetwork } from "./config";

/** Soft Design chrome B — hang off SIGNING… (~15s ±5 OK). */
export const HL_CONNECT_BUSY_TIMEOUT_MS = 15_000;

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
 * active chain ≠ HL EIP-712 domain 0x66eee / 421614 (OneKey / viem).
 * Visibly not Soft-nice Cancel / user reject.
 */
export const HL_CONNECT_CHAIN_MISMATCH =
  "Chain / session mismatch — switch wallet to Arbitrum Sepolia, then retry.";

export type HlUserSignedAttemptResult =
  | { ok: true }
  | { ok: false; error: string };

export type EnsureSignatureChainFn = (
  network: HlNetwork
) => Promise<{ ok: true } | { ok: false; error: string }>;

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

/**
 * Soft ACK #262 Soft Design A/B — Soft-map CONNECT / builder sticky Soft-fail.
 * Never surfaces raw provider "user rejected" verbatim on sticky.
 */
export function formatHlConnectStickyError(
  error: string | null | undefined
): string {
  if (!error || !error.trim()) return HL_CONNECT_FAILED;
  const raw = error.trim();

  if (isHlConnectUserCancelled(raw)) return HL_CONNECT_USER_CANCELLED;

  // Soft ACK #262 rework Soft Design A — Soft-nice chain/session Soft-fail
  // before Soft-map Soft-reject Soft-noise (combined errors may embed both).
  if (isHlConnectChainMismatch(raw)) return HL_CONNECT_CHAIN_MISMATCH;

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

/**
 * Soft ACK #260 C: preserve user gesture — typed-data first; optional
 * `ensureSignatureChain` + single retry only when the first failure looks
 * chain-related. Domain `chainId` stays `0x66eee` inside the attempt (lock B).
 */
export async function runHlUserSignedWithOptionalChainRetry(args: {
  network: HlNetwork;
  ensureSignatureChain: EnsureSignatureChainFn;
  attempt: () => Promise<HlUserSignedAttemptResult>;
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
    const combined =
      chain.error && chain.error !== first.error
        ? `${first.error} (${chain.error})`
        : first.error;
    return { ok: false, error: combined, retriedWithChainSwitch: false };
  }
  const second = await args.attempt();
  if (second.ok) {
    return { ok: true, retriedWithChainSwitch: true };
  }
  return {
    ok: false,
    error: second.error,
    retriedWithChainSwitch: true
  };
}
