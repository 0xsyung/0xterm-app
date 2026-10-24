/**
 * @file userSignedConnect.ts
 * @description Soft ACK #260 — iPhone PERPS CONNECT: sign-first HL user-signed flow
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 *
 * iOS Safari / WalletConnect often drops the user-gesture chain after an async
 * `switchChain` deep-link, so a hard `ensureSignatureChain` *before*
 * `signTypedDataAsync` makes CONNECT HYPERLIQUID look dead. EIP-712 domain
 * already embeds `chainId = 0x66eee` (SDK lock B) — attempt typed-data first,
 * and only then align the wallet + retry when the failure looks chain-related
 * (not a user reject / not an HL exchange business error).
 */
import type { HlNetwork } from "./config";

/** Soft Design chrome B — hang off SIGNING… (~15s ±5 OK). */
export const HL_CONNECT_BUSY_TIMEOUT_MS = 15_000;

export const HL_CONNECT_TIMEOUT_COPY =
  "Wallet did not respond — check MetaMask / WalletConnect, then retry.";

export const HL_CONNECT_SIGNING_HINT = "Check wallet / MetaMask";

export const HL_CONNECT_WALLET_REQUIRED = "Connect wallet first.";

export type HlUserSignedAttemptResult =
  | { ok: true }
  | { ok: false; error: string };

export type EnsureSignatureChainFn = (
  network: HlNetwork
) => Promise<{ ok: true } | { ok: false; error: string }>;

/** True when the wallet UI rejected / cancelled the prompt. */
export function isWalletUserRejected(error: string | null | undefined): boolean {
  if (!error) return false;
  return /user rejected|denied|cancelled|canceled|rejected the request/i.test(
    error
  );
}

/**
 * True when a failed attempt is worth one chain-align + retry (wallet/chain/
 * signing surface) — not HL exchange / deposit / business rejects.
 */
export function shouldRetryHlUserSignedWithChainSwitch(
  error: string | null | undefined
): boolean {
  if (!error || isWalletUserRejected(error)) return false;
  // HL /exchange business + post-sign verification — do not re-prompt.
  if (
    /Must deposit|HTTP \d|not listed as an approved|unified account|Exchange rejected|\/exchange/i.test(
      error
    )
  ) {
    return false;
  }
  return /chain|network|switch|sign|typed.?data|wallet|provider|disconnected|session|unsupported|mismatch|wrong network|approveAgent signature rejected|approveBuilderFee signature rejected/i.test(
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
