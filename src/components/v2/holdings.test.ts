/**
 * @file holdings.test.ts
 * @description Map live portfolio rows to V2 Holdings (zeros hidden, WETH kept)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it } from "vitest";
import type { PortfolioHolding } from "@/components/terminal/widgets/PortfolioWidget";
import { hasVisibleBalance, mapPortfolioHoldingsToV2 } from "./holdings";

function row(
  overrides: Partial<PortfolioHolding> &
    Pick<PortfolioHolding, "symbol" | "chainId" | "chainName" | "balance">
): PortfolioHolding {
  return {
    type: "erc20",
    priceUsd: null,
    valueUsd: null,
    change24h: null,
    priceSource: "—",
    isTestnet: false,
    account: "self",
    ...overrides
  };
}

describe("hasVisibleBalance", () => {
  it("hides zero and empty numeric balances", () => {
    expect(hasVisibleBalance("0")).toBe(false);
    expect(hasVisibleBalance("0.0")).toBe(false);
    expect(hasVisibleBalance("0.00")).toBe(false);
  });

  it("keeps a non-zero quantity", () => {
    expect(hasVisibleBalance("1.25")).toBe(true);
    expect(hasVisibleBalance("0.00000001")).toBe(true);
  });
});

describe("mapPortfolioHoldingsToV2", () => {
  it("maps symbol, qty, USD, chain label, and 24h change from the fetch row", () => {
    const mapped = mapPortfolioHoldingsToV2([
      row({
        symbol: "WETH",
        chainId: 1,
        chainName: "Ethereum",
        balance: "1.5",
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        priceUsd: 2000,
        valueUsd: 3000,
        change24h: 1.25,
        priceSource: "api"
      })
    ]);
    expect(mapped).toEqual([
      {
        symbol: "WETH",
        chainId: 1,
        chainLabel: "Ethereum",
        qty: "1.5",
        valueUsd: 3000,
        change24h: 1.25,
        pctOfPortfolio: 100
      }
    ]);
  });

  it("includes WETH when the fetch returns a non-zero WETH row", () => {
    const mapped = mapPortfolioHoldingsToV2([
      row({
        symbol: "ETH",
        chainId: 1,
        chainName: "Ethereum",
        type: "native",
        balance: "0.2",
        valueUsd: 400
      }),
      row({
        symbol: "WETH",
        chainId: 8453,
        chainName: "Base",
        balance: "0.1",
        address: "0x4200000000000000000000000000000000000006",
        valueUsd: 200
      })
    ]);
    const weth = mapped.find((h) => h.symbol === "WETH" && h.chainId === 8453);
    expect(weth).toBeDefined();
    expect(weth?.qty).toBe("0.1");
    expect(weth?.valueUsd).toBe(200);
    expect(weth?.pctOfPortfolio).toBeCloseTo((200 / 600) * 100);
  });

  it("hides zero-balance native and token rows", () => {
    const mapped = mapPortfolioHoldingsToV2([
      row({
        symbol: "ETH",
        chainId: 1,
        chainName: "Ethereum",
        type: "native",
        balance: "0"
      }),
      row({
        symbol: "USDC",
        chainId: 1,
        chainName: "Ethereum",
        balance: "0.0",
        valueUsd: 0
      }),
      row({
        symbol: "WETH",
        chainId: 1,
        chainName: "Ethereum",
        balance: "0.01",
        valueUsd: 20
      })
    ]);
    expect(mapped.map((h) => h.symbol)).toEqual(["WETH"]);
  });

  it("drops testnet rows even when the balance is non-zero", () => {
    const mapped = mapPortfolioHoldingsToV2([
      row({
        symbol: "WETH",
        chainId: 11155111,
        chainName: "Sepolia",
        balance: "2",
        valueUsd: 0,
        isTestnet: true
      })
    ]);
    expect(mapped).toEqual([]);
  });

  it("leaves USD and share blank when the price API did not return a value", () => {
    const mapped = mapPortfolioHoldingsToV2([
      row({
        symbol: "WETH",
        chainId: 10,
        chainName: "OP Mainnet",
        balance: "3",
        valueUsd: null,
        change24h: null
      })
    ]);
    expect(mapped[0]?.valueUsd).toBeNull();
    expect(mapped[0]?.pctOfPortfolio).toBeNull();
    expect(mapped[0]?.qty).toBe("3");
  });

  it("returns an empty list when the fetch is empty (disconnected or no assets)", () => {
    expect(mapPortfolioHoldingsToV2([])).toEqual([]);
  });
});
