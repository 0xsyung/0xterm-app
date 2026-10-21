/**
 * @file preflight.ts
 * @description B1 app write preflight for external DEX / Morpho paths (Soft ACK #139)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 *
 * Own-contract `onlyPro` is contracts-side (slice 2). Will stays ungated by Pro
 * in v1 (Soft ACK #247 lock 10). FORENSIC / NEWS / reads / quotes stay free.
 * When ProPass is not wired on the chain, the gate is inactive (no mainnet sneak).
 */
import type { Address } from "viem";

/** Minimal read surface — accepts wagmi usePublicClient and viem createPublicClient. */
export type ProReadClient = {
  // Broad signature: viem PublicClient generics are invariant across call sites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readContract: (...args: any[]) => Promise<any>;
};
import { PRO_PASS_CONTRACT, proPassAbi } from "../constants";
import {
  PRO_EXTERNAL_WRITE_COMMANDS,
  PRO_REFUSE,
  PRO_VAULT_READ_SUBS
} from "./constants";

export type ProPreflight =
  | { ok: true; gated: boolean; isPro: boolean }
  | { ok: false; error: string };

/** True when this chain has a ProPass proxy wired — gate applies. */
export function isProGateActive(chainId: number): boolean {
  return !!PRO_PASS_CONTRACT[chainId];
}

export async function readIsPro(
  client: ProReadClient,
  chainId: number,
  account: Address
): Promise<boolean> {
  const contract = PRO_PASS_CONTRACT[chainId];
  if (!contract) return false;
  return (await client.readContract({
    address: contract,
    abi: proPassAbi,
    functionName: "isPro",
    args: [account]
  })) as boolean;
}

/**
 * B1: block non-Pro external write txs when ProPass is deployed on the chain.
 * Allow when gate inactive (no address) so mainnet/Base keep working until Soft ACK.
 */
export async function requireProForExternalWrite(opts: {
  client: ProReadClient;
  chainId: number;
  account: Address | undefined | null;
}): Promise<ProPreflight> {
  if (!isProGateActive(opts.chainId)) {
    return { ok: true, gated: false, isPro: false };
  }
  if (!opts.account) {
    return { ok: false, error: PRO_REFUSE.noWallet };
  }
  const isPro = await readIsPro(opts.client, opts.chainId, opts.account);
  if (!isPro) {
    return { ok: false, error: PRO_REFUSE.notPro };
  }
  return { ok: true, gated: true, isPro: true };
}

/** Whether a shell command (and optional vault sub) needs B1 preflight. */
export function commandNeedsProPreflight(
  cmd: string,
  vaultSub?: string | null
): boolean {
  const key = cmd.trim().toLowerCase();
  if (!PRO_EXTERNAL_WRITE_COMMANDS.has(key)) return false;
  if (key === "vault") {
    const sub = (vaultSub || "").toLowerCase();
    return !PRO_VAULT_READ_SUBS.has(sub);
  }
  // arb: only the run path is a write — callers pass needsWrite=true for run
  return true;
}

/**
 * Pure decision for tests: given gate-active + isPro, should we block?
 * Will / Pro purchase / reads never call this.
 */
export function shouldBlockExternalWrite(opts: {
  gateActive: boolean;
  isPro: boolean;
}): boolean {
  return opts.gateActive && !opts.isPro;
}

/** Convenience for widgets: null if allowed, else Soft-fail copy. */
export async function proGateOrError(opts: {
  client: ProReadClient | null | undefined;
  chainId: number;
  account: Address | undefined | null;
}): Promise<string | null> {
  if (!isProGateActive(opts.chainId)) return null;
  if (!opts.client) return PRO_REFUSE.notPro;
  const r = await requireProForExternalWrite({
    client: opts.client,
    chainId: opts.chainId,
    account: opts.account
  });
  return r.ok ? null : r.error;
}
