/**
 * @file holdings.ts
 * @description Map terminal portfolio holdings onto V2 Holdings rows
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address, Chain, PublicClient } from "viem";
import type { Config } from "wagmi";
import type { PortfolioHolding } from "@/components/terminal/widgets/PortfolioWidget";
import type { V2HoldingRow } from "./screens/HoldingsScreen";
import { isV2Mainnet } from "./networks";

/** True when a fetched balance should appear in Holdings (zeros stay hidden). */
export function hasVisibleBalance(balance: string): boolean {
  const n = Number(balance);
  return Number.isFinite(n) && n > 0;
}

/**
 * Map live `fetchPortfolioHoldings` rows to V2 table rows.
 * Hides zero balances, drops non-V2 (testnet) chains, and never invents qty/USD.
 */
export function mapPortfolioHoldingsToV2(
  rows: readonly PortfolioHolding[]
): V2HoldingRow[] {
  const visible = rows.filter(
    (h) => isV2Mainnet(h.chainId) && hasVisibleBalance(h.balance)
  );
  const totalUsd = visible.reduce(
    (acc, h) => acc + (h.valueUsd != null ? h.valueUsd : 0),
    0
  );
  return visible.map((h) => ({
    symbol: h.symbol,
    chainId: h.chainId,
    chainLabel: h.chainName,
    qty: h.balance,
    valueUsd: h.valueUsd,
    change24h: h.change24h,
    pctOfPortfolio:
      h.valueUsd != null && totalUsd > 0 ? (h.valueUsd / totalUsd) * 100 : null
  }));
}


