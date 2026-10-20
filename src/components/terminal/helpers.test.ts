/**
 * @file helpers.test.ts
 * @description Unit tests for pure terminal helpers
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it } from "vitest";
import {
  applyPinRefreshOutcome,
  isPinnableLog,
  isPinnableManifest,
  migrateCustomTokens,
  PRICE_PIN_REFRESH_SEC,
  pricePinKey,
  withPricePinRefreshSec
} from "./helpers";
import { TICKER_REFRESH_SEC } from "./ticker";
import type { PinnedManifest } from "./types";

describe("isPinnableLog", () => {
  it("allows live monitors (price / balance / portfolio / ticker / news / pnl / dig-artifact / dig-run / dig-debug)", () => {
    expect(
      isPinnableLog({ type: "component", componentData: { kind: "price" } })
    ).toBe(true);
    expect(isPinnableLog({ type: "balance" })).toBe(true);
    expect(isPinnableLog({ type: "portfolio" })).toBe(true);
    expect(isPinnableLog({ type: "ticker" })).toBe(true);
    expect(isPinnableLog({ type: "news" })).toBe(true);
    expect(isPinnableLog({ type: "pnl" })).toBe(true);
    expect(isPinnableLog({ type: "dig-artifact" })).toBe(true);
    expect(isPinnableLog({ type: "dig-run" })).toBe(true);
    expect(isPinnableLog({ type: "dig-debug" })).toBe(true);
    expect(isPinnableLog({ type: "poly" })).toBe(true);
    expect(isPinnableLog({ type: "vault" })).toBe(true);
    expect(
      isPinnableLog({ type: "component", componentData: { kind: "kyt" } })
    ).toBe(true);
    expect(
      isPinnableLog({ type: "component", componentData: { kind: "kya" } })
    ).toBe(true);
  });

  it("rejects non-live log kinds", () => {
    for (const type of [
      "networks",
      "chat",
      "billboard",
      "share",
      "feed",
      "createpool",
      "initialize",
      "addliq",
      "help",
      "dexes",
      "input",
      "text",
      "dig-editor",
      "dig-abi",
      "dig-opcodes",
      "dig-confirm",
      "dig-ls",
      "dig-fn"
    ]) {
      expect(isPinnableLog({ type })).toBe(false);
    }
  });

  it("rejects component logs that are not price/kyt/kya", () => {
    expect(isPinnableLog({ type: "component" })).toBe(false);
    expect(isPinnableLog({ type: "component", componentData: { kind: "swap" } })).toBe(false);
    expect(isPinnableLog({ type: "component", componentData: undefined })).toBe(false);
  });
});

describe("isPinnableManifest", () => {
  it("allows price / balance / portfolio / ticker / news / pnl / dig-artifact / dig-run / dig-debug manifests", () => {
    expect(isPinnableManifest({ kind: "component", componentData: { kind: "price" } })).toBe(true);
    expect(isPinnableManifest({ kind: "balance" })).toBe(true);
    expect(isPinnableManifest({ kind: "portfolio" })).toBe(true);
    expect(isPinnableManifest({ kind: "ticker" })).toBe(true);
    expect(isPinnableManifest({ kind: "news" })).toBe(true);
    expect(isPinnableManifest({ kind: "pnl" })).toBe(true);
    expect(isPinnableManifest({ kind: "dig-artifact" })).toBe(true);
    expect(isPinnableManifest({ kind: "dig-run" })).toBe(true);
    expect(isPinnableManifest({ kind: "dig-debug" })).toBe(true);
    expect(isPinnableManifest({ kind: "plan" })).toBe(true);
    expect(isPinnableManifest({ kind: "will" })).toBe(true);
    expect(isPinnableManifest({ kind: "when" })).toBe(true);
    expect(isPinnableManifest({ kind: "ipfs" })).toBe(true);
    expect(
      isPinnableManifest({ kind: "component", componentData: { kind: "kyt" } })
    ).toBe(true);
    expect(
      isPinnableManifest({ kind: "component", componentData: { kind: "kya" } })
    ).toBe(true);
  });

  it("rejects manifests for non-live kinds", () => {
    expect(isPinnableManifest({ kind: "networks" })).toBe(false);
    expect(isPinnableManifest({ kind: "chat" })).toBe(false);
    expect(isPinnableManifest({ kind: "gchat" })).toBe(false);
    expect(isPinnableManifest({ kind: "billboard" })).toBe(false);
    expect(isPinnableManifest({ kind: "share" })).toBe(false);
    expect(isPinnableManifest({ kind: "feed" })).toBe(false);
    expect(isPinnableManifest({ kind: "swap" })).toBe(false);
  });

  it("rejects price-kind manifests missing price data (legacy widget-unavailable)", () => {
    expect(isPinnableManifest({ kind: "component", title: "USDC/WETH" })).toBe(false);
    expect(isPinnableManifest({ kind: "component", componentData: {} })).toBe(false);
  });

  it("rejects falsy / kindless input", () => {
    expect(isPinnableManifest(null)).toBe(false);
    expect(isPinnableManifest(undefined)).toBe(false);
    expect(isPinnableManifest({ id: "x" })).toBe(false);
    expect(isPinnableManifest({})).toBe(false);
  });
});

describe("pricePinKey", () => {
  it("returns null for non-price payloads", () => {
    expect(pricePinKey({ kind: "swap" }, 8453, "univ3")).toBeNull();
    expect(pricePinKey(undefined, 8453, "univ3")).toBeNull();
    expect(pricePinKey(null, 8453, "univ3")).toBeNull();
  });

  it("returns null for onchain price missing required parts", () => {
    expect(pricePinKey({ kind: "price", mode: "onchain" }, 8453, "univ3")).toBeNull();
    expect(pricePinKey({ kind: "price", mode: "onchain", pairAddress: "0x" }, null, "univ3")).toBeNull();
    expect(pricePinKey({ kind: "price", mode: "onchain", pairAddress: "0x" }, 8453, null)).toBeNull();
  });

  it("builds an onchain key (lowercased address)", () => {
    expect(
      pricePinKey(
        { kind: "price", mode: "onchain", pairAddress: "0xAbC123" },
        8453,
        "univ3"
      )
    ).toBe("price:onchain:8453:univ3:0xabc123");
  });

  it("builds an api key from token/quote symbols", () => {
    expect(
      pricePinKey(
        { kind: "price", mode: "api", chain: "base", dex: "uniswap", tokenSymbol: "USDC", quoteSymbol: "WETH" },
        null,
        null
      )
    ).toBe("price:api:base:uniswap:usdc/weth");
  });

  it("returns null for api price missing required parts", () => {
    expect(
      pricePinKey({ kind: "price", mode: "api", chain: "base", dex: "uniswap" }, null, null)
    ).toBeNull();
    expect(
      pricePinKey({ kind: "price", mode: "api", chain: "", dex: "uniswap", tokenSymbol: "A", quoteSymbol: "B" }, null, null)
    ).toBeNull();
    expect(
      pricePinKey({ kind: "price", mode: "api", chain: "base", dex: "" }, null, null)
    ).toBeNull();
  });
});


describe("price pin refresh cadence (#169)", () => {
  it("PRICE_PIN_REFRESH_SEC matches TICKER_REFRESH_SEC (15s)", () => {
    expect(PRICE_PIN_REFRESH_SEC).toBe(15);
    expect(PRICE_PIN_REFRESH_SEC).toBe(TICKER_REFRESH_SEC);
  });

  it("withPricePinRefreshSec sets 15s on price component pins", () => {
    const pin: PinnedManifest = {
      id: "p1",
      kind: "component",
      title: "PRICE ETH/USDC",
      componentData: { kind: "price", mode: "api" }
    };
    expect(withPricePinRefreshSec(pin).refreshSec).toBe(15);
    expect(
      withPricePinRefreshSec({
        id: "b1",
        kind: "balance",
        title: "BALANCE"
      } as PinnedManifest).refreshSec
    ).toBeUndefined();
  });

  it("applyPinRefreshOutcome marks STALE on fail and clears on success", () => {
    const pin: PinnedManifest = {
      id: "p1",
      kind: "component",
      title: "PRICE ETH/USDC",
      refreshSec: 15,
      componentData: {
        kind: "price",
        mode: "api",
        priceUsd: "1",
        tokenSymbol: "ETH",
        quoteSymbol: "USDC"
      }
    };
    const stale = applyPinRefreshOutcome(pin, { ok: false });
    expect(stale.stale).toBe(true);
    expect(stale.componentData?.priceUsd).toBe("1");

    const fresh = applyPinRefreshOutcome(stale, {
      ok: true,
      payload: {
        componentData: {
          ...pin.componentData,
          priceUsd: "2"
        }
      }
    });
    expect(fresh.stale).toBe(false);
    expect(fresh.componentData?.priceUsd).toBe("2");
  });
});

describe("migrateCustomTokens", () => {
  it("converts legacy symbol-keyed maps into list form with back-filled ids", () => {
    const out = migrateCustomTokens({
      "8453": {
        USDC: { address: "0xAAAA", symbol: "USDC", name: "USD Coin", decimals: 6 },
        MOCK: { address: "0xBBBB", symbol: "MOCK", name: "Mock" }
      }
    });
    expect(out[8453]).toHaveLength(2);
    expect(out[8453][0]).toMatchObject({
      id: "c_0xaaaa",
      address: "0xAAAA",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      isNative: false
    });
    expect(out[8453][1].id).toBe("c_0xbbbb");
  });

  it("normalizes array form, preserving existing ids", () => {
    const out = migrateCustomTokens({
      "1": [
        { id: "c_keep", address: "0x1234", symbol: "FOO", name: "Foo", isNative: false },
        { address: "0x5678", symbol: "BAR", name: "Bar" }
      ]
    });
    expect(out[1][0].id).toBe("c_keep");
    expect(out[1][1].id).toBe("c_0x5678");
    expect(out[1][1].isNative).toBe(false);
  });

  it("drops malformed entries", () => {
    const out = migrateCustomTokens({
      "8453": [null, { symbol: "no-address" }, { address: "0xCCC", symbol: "OK", name: "" }]
    });
    expect(out[8453]).toHaveLength(1);
    expect(out[8453][0].symbol).toBe("OK");
  });

  it("guards tokenType to known values", () => {
    const out = migrateCustomTokens({
      "1": [{ address: "0xAAA", symbol: "T", name: "", tokenType: "erc721", isNative: true }]
    });
    expect(out[1][0].tokenType).toBe("erc721");
    expect(out[1][0].isNative).toBe(true);
  });

  it("is idempotent", () => {
    const raw = {
      "8453": [
        { id: "c_0xabc", address: "0xABC", symbol: "T", name: "", decimals: 18, tokenType: "erc20", isNative: false }
      ]
    };
    expect(migrateCustomTokens(raw)).toEqual(migrateCustomTokens(migrateCustomTokens(raw)));
  });

  it("returns an empty map for nullish/empty input", () => {
    expect(migrateCustomTokens(null)).toEqual({});
    expect(migrateCustomTokens(undefined)).toEqual({});
    expect(migrateCustomTokens({})).toEqual({});
  });
});
