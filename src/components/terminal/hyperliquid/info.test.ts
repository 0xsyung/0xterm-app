/**
 * @file info.test.ts
 * @description /info client (#190)
 */
import { describe, expect, it, vi } from "vitest";
import {
  assetIndexByCoin,
  fetchAllMids,
  fetchClearinghouseState,
  fetchExtraAgents,
  fetchMaxBuilderFee,
  fetchMeta,
  fetchOpenOrders,
  midPxForCoin
} from "./info";

function mockFetch(json: unknown, ok = true): typeof fetch {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => json
  })) as unknown as typeof fetch;
}

describe("hl info client (#190)", () => {
  it("fetchMeta posts type meta", async () => {
    const fetchImpl = mockFetch({ universe: [{ name: "BTC", szDecimals: 5 }] });
    const meta = await fetchMeta("testnet", fetchImpl);
    expect(meta.universe[0].name).toBe("BTC");
    expect(fetchImpl).toHaveBeenCalled();
    const mocked = fetchImpl as typeof fetch & { mock: { calls: unknown[][] } };
    const init = mocked.mock.calls[0]?.[1] as { body?: string };
    expect(JSON.parse(init.body || "{}").type).toBe("meta");
  });

  it("fetchExtraAgents returns array", async () => {
    const fetchImpl = mockFetch([{ address: "0xabc" }]);
    const agents = await fetchExtraAgents("testnet", "0xUser", fetchImpl);
    expect(agents).toHaveLength(1);
  });

  it("fetchMaxBuilderFee coerces number", async () => {
    const fetchImpl = mockFetch(20);
    expect(await fetchMaxBuilderFee("testnet", "0xu", "0xb", fetchImpl)).toBe(
      20
    );
  });

  it("fetchOpenOrders / clearinghouse / mids", async () => {
    expect(
      await fetchOpenOrders(
        "testnet",
        "0xu",
        mockFetch([{ coin: "BTC", oid: 1, side: "B", limitPx: "1", sz: "1", timestamp: 1 }])
      )
    ).toHaveLength(1);
    const ch = await fetchClearinghouseState(
      "testnet",
      "0xu",
      mockFetch({ assetPositions: [] })
    );
    expect(ch.assetPositions).toEqual([]);
    const mids = await fetchAllMids("testnet", mockFetch({ BTC: "100" }));
    expect(midPxForCoin(mids, "BTC")).toBe("100");
  });

  it("assetIndexByCoin", () => {
    expect(
      assetIndexByCoin({ universe: [{ name: "ETH", szDecimals: 4 }] }, "eth")
    ).toBe(0);
    expect(assetIndexByCoin({ universe: [] }, "BTC")).toBe(-1);
  });

  it("throws on HTTP error", async () => {
    await expect(fetchMeta("testnet", mockFetch(null, false))).rejects.toThrow(
      /HTTP 500/
    );
  });
});
