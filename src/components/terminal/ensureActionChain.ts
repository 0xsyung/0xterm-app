/**
 * @file ensureActionChain.ts
 * @description Wallet chain guard for per-action network writes (#156 / PR #157 must-fix)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 *
 * `resolveActionChain` picks the chain a command *should* run on (override or
 * default). Wagmi, however, submits on whatever chain the connected wallet is
 * on unless told otherwise. Every write that targets a resolved chain must:
 *
 *   1. `await ensureChainForAction(resolvedChainId, deps)` — switches the
 *      wallet (switchChainAsync) when it is on a different chain, and returns
 *      an error (tx NOT sent) when the switch is rejected / fails.
 *   2. Pass `chainId: resolvedChainId` to `writeContractAsync` /
 *      `sendTransactionAsync` — wagmi/viem then hard-stop with a chain
 *      mismatch error if the wallet moved off the chain between (1) and the
 *      signature prompt.
 *
 * Used by TerminalShell: chat (setPublicKey/sendMessage), feedback, board
 * post, share/unshare, ens set/clear, dig deploy/send, channel deploy.
 * Regression guard: ensureActionChain.test.ts scans TerminalShell for writes
 * without `chainId`.
 */
import { shortNameForChainId } from "./actionNetworks";

export type SwitchChainFn = (args: { chainId: number }) => Promise<unknown>;

export type EnsureChainDeps = {
  /** Chain the connected wallet currently reports (wagmi useAccount().chainId). */
  walletChainId: number | null | undefined;
  switchChainAsync: SwitchChainFn;
};

export type EnsureChainResult =
  | { ok: true; chainId: number; switched: boolean }
  | { ok: false; error: string };

const label = (chainId: number | null | undefined): string =>
  shortNameForChainId(chainId) || (chainId != null ? `chain ${chainId}` : "unknown chain");

export function formatChainSwitchFailed(
  target: number,
  walletChainId: number | null | undefined
): string {
  return `[!] Wallet is on ${label(walletChainId)} — switch to ${label(target)} was rejected or failed. Tx not sent.`;
}

/**
 * Make sure the connected wallet is on `targetChainId` before a write.
 * Never throws; callers return `error` as a warn line and skip the tx.
 */
export async function ensureChainForAction(
  targetChainId: number | null | undefined,
  deps: EnsureChainDeps
): Promise<EnsureChainResult> {
  if (targetChainId == null) {
    return { ok: false, error: "[!] Set a network first (network <name|id>)." };
  }
  if (deps.walletChainId === targetChainId) {
    return { ok: true, chainId: targetChainId, switched: false };
  }
  try {
    await deps.switchChainAsync({ chainId: targetChainId });
    return { ok: true, chainId: targetChainId, switched: true };
  } catch {
    return {
      ok: false,
      error: formatChainSwitchFailed(targetChainId, deps.walletChainId)
    };
  }
}
