/**
 * @file networks.ts
 * @description V2 mainnet-only network set (#295)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  mainnet,
  arbitrum,
  base,
  polygon,
  optimism,
  hyperEvm,
  type Chain
} from "viem/chains";

/** Day-one mainnets only — FAIL if testnets appear in V2 Connect/Settings/Receive. */
export const V2_MAINNET_CHAINS: readonly Chain[] = [
  mainnet,
  arbitrum,
  base,
  polygon,
  optimism,
  hyperEvm
] as const;

export const V2_MAINNET_IDS: readonly number[] = V2_MAINNET_CHAINS.map(
  (c) => c.id
);

export function isV2Mainnet(chainId: number | null | undefined): boolean {
  if (chainId == null) return false;
  return (V2_MAINNET_IDS as readonly number[]).includes(chainId);
}

export function v2ChainShortName(chainId: number): string {
  const SHORT: Record<number, string> = {
    1: "ETH",
    42161: "ARB",
    8453: "BASE",
    137: "POLYGON",
    10: "OP",
    999: "HYPE"
  };
  return SHORT[chainId] || String(chainId);
}

export function v2ChainById(chainId: number): Chain | undefined {
  return V2_MAINNET_CHAINS.find((c) => c.id === chainId);
}
