/**
 * @file hopsSource.ts
 * @description Fail-closed Alchemy / explorer source detection (#16/#17/#170)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type HopsSourceKind = "alchemy" | "explorer" | null;

export type HopsSourceInput = {
  /** Active RPC URL for the chain (null = public/default / unset). */
  rpcUrl: string | null | undefined;
  /** Etherscan v2 / explorer API key for this chainId, if any. */
  explorerKey: string | null | undefined;
};

/** True when the active RPC is an Alchemy URL (`g.alchemy.com`). */
export function isAlchemyRpcUrl(rpcUrl: string | null | undefined): boolean {
  if (!rpcUrl) return false;
  try {
    const host = new URL(rpcUrl).hostname.toLowerCase();
    return host.endsWith("g.alchemy.com") || host.includes(".alchemy.com");
  } catch {
    return /g\.alchemy\.com/i.test(rpcUrl);
  }
}

/**
 * Prefer Alchemy when active RPC is Alchemy; else explorer key; else null
 * (fail closed — never invent hops / history).
 */
export function resolveHopsSource(input: HopsSourceInput): HopsSourceKind {
  if (isAlchemyRpcUrl(input.rpcUrl)) return "alchemy";
  if (input.explorerKey && input.explorerKey.trim()) return "explorer";
  return null;
}

export function hasHopsSource(input: HopsSourceInput): boolean {
  return resolveHopsSource(input) !== null;
}
