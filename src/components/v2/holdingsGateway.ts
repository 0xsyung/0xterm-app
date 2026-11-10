/**
 * @file holdingsGateway.ts
 * @description Lazy live-holdings loader so V2Shell stays import-light for unit tests
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address } from "viem";
import type { Config } from "wagmi";
import type { V2HoldingRow } from "./screens/HoldingsScreen";

export type V2HoldingsFetcher = (
  userAddress: Address,
  config: Config
) => Promise<V2HoldingRow[]>;

let fetcher: V2HoldingsFetcher | null = null;

export function setV2HoldingsFetcher(next: V2HoldingsFetcher | null): void {
  fetcher = next;
}

/**
 * Load live holdings. The portfolio stack is loaded via an opaque dynamic
 * import so V2Shell unit tests never pull wagmi/actions / portfolio into the
 * transform graph.
 */
export async function loadV2Holdings(
  userAddress: Address,
  config: Config
): Promise<V2HoldingRow[]> {
  if (!fetcher) {
    const moduleId = `./${"fetchV2Holdings"}`;
    // Opaque import — do not rewrite this into a static dependency.
    const mod = (await import(/* @vite-ignore */ moduleId)) as {
      fetchV2Holdings: V2HoldingsFetcher;
    };
    fetcher = mod.fetchV2Holdings;
  }
  return fetcher(userAddress, config);
}
