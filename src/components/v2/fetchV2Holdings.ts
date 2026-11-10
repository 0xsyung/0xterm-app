/**
 * @file fetchV2Holdings.ts
 * @description Live V2 Holdings fetch via the terminal portfolio stack
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address, Chain, PublicClient } from "viem";
import type { Config } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import { fetchPortfolioHoldings } from "@/components/terminal/portfolio";
import { mapPortfolioHoldingsToV2 } from "./holdings";
import type { V2HoldingRow } from "./screens/HoldingsScreen";

/** Reuse the terminal portfolio fetcher; custom tokens stay out of scope day-one. */
export async function fetchV2Holdings(
  userAddress: Address,
  config: Config
): Promise<V2HoldingRow[]> {
  const rows = await fetchPortfolioHoldings(
    userAddress,
    {},
    undefined,
    {
      getClient: (chain: Chain) => {
        const client = getPublicClient(config, { chainId: chain.id });
        if (!client) {
          throw new Error(`No public client configured for ${chain.name}`);
        }
        return client as PublicClient;
      }
    },
    "self"
  );
  return mapPortfolioHoldingsToV2(rows);
}
