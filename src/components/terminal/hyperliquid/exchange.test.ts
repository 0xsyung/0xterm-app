/**
 * @file exchange.test.ts
 * @description /exchange posts with mocked fetch + local agent (#190)
 */
import { describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  postCancelWithAgent,
  postOrderWithAgent,
  postApproveAgent,
  postApproveBuilderFee
} from "./exchange";
import type { SignTypedDataFn } from "./signing";

type MockFetch = typeof fetch & { mock: { calls: unknown[][] } };

function mockFetch(json: unknown, ok = true): MockFetch {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => json
  })) as unknown as MockFetch;
}

function postedBody(fetchImpl: MockFetch): Record<string, unknown> {
  const init = fetchImpl.mock.calls[0]?.[1] as { body?: string };
  return JSON.parse(init.body || "{}") as Record<string, unknown>;
}

describe("hl exchange client (#190)", () => {
  it("posts agent-signed order with builder fee", async () => {
    const pk = generatePrivateKey();
    const fetchImpl = mockFetch({ status: "ok", response: { type: "order" } });
    const result = await postOrderWithAgent({
      network: "testnet",
      agentPrivateKey: pk,
      asset: 0,
      isBuy: true,
      price: "100",
      size: "0.01",
      tif: "Ioc",
      builderFeeBp: 2,
      builder: "0x1111111111111111111111111111111111111111",
      fetchImpl
    });
    expect(result.ok).toBe(true);
    const body = postedBody(fetchImpl);
    expect(body.action && (body.action as { type: string }).type).toBe("order");
    expect(
      body.action && (body.action as { builder: { f: number } }).builder.f
    ).toBe(20);
    expect(
      body.signature && (body.signature as { r: string }).r
    ).toMatch(/^0x/);
  });

  it("posts agent-signed cancel", async () => {
    const pk = generatePrivateKey();
    const fetchImpl = mockFetch({ status: "ok" });
    const result = await postCancelWithAgent({
      network: "testnet",
      agentPrivateKey: pk,
      asset: 0,
      oid: 9,
      fetchImpl
    });
    expect(result.ok).toBe(true);
  });

  it("surfaces exchange err status", async () => {
    const pk = generatePrivateKey();
    const fetchImpl = mockFetch({ status: "err", response: "Must deposit" });
    const result = await postOrderWithAgent({
      network: "testnet",
      agentPrivateKey: pk,
      asset: 0,
      isBuy: true,
      price: "1",
      size: "1",
      tif: "Gtc",
      builderFeeBp: 2,
      builder: "0x1111111111111111111111111111111111111111",
      fetchImpl
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/deposit/i);
  });

  it("approveAgent uses wallet signTypedData", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const signTypedDataAsync: SignTypedDataFn = async (args) =>
      wallet.signTypedData(
        args as Parameters<typeof wallet.signTypedData>[0]
      );
    const fetchImpl = mockFetch({ status: "ok" });
    const result = await postApproveAgent({
      network: "testnet",
      agentAddress: "0x2222222222222222222222222222222222222222",
      signTypedDataAsync,
      fetchImpl
    });
    expect(result.ok).toBe(true);
    expect(
      (postedBody(fetchImpl).action as { type: string }).type
    ).toBe("approveAgent");
  });

  it("approveBuilderFee includes maxFeeRate string", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const signTypedDataAsync: SignTypedDataFn = async (args) =>
      wallet.signTypedData(
        args as Parameters<typeof wallet.signTypedData>[0]
      );
    const fetchImpl = mockFetch({ status: "ok" });
    const result = await postApproveBuilderFee({
      network: "testnet",
      builder: "0x3333333333333333333333333333333333333333",
      maxFeeBp: 2,
      signTypedDataAsync,
      fetchImpl
    });
    expect(result.ok).toBe(true);
    expect(
      (postedBody(fetchImpl).action as { maxFeeRate: string }).maxFeeRate
    ).toBe("0.02%");
  });

  it("returns HTTP error from exchange", async () => {
    const pk = generatePrivateKey();
    const fetchImpl = mockFetch({ detail: "nope" }, false);
    const result = await postCancelWithAgent({
      network: "testnet",
      agentPrivateKey: pk,
      asset: 0,
      oid: 1,
      fetchImpl
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/HTTP 500/);
  });

  it("returns network failure", async () => {
    const pk = generatePrivateKey();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const result = await postCancelWithAgent({
      network: "testnet",
      agentPrivateKey: pk,
      asset: 0,
      oid: 1,
      fetchImpl
    });
    expect(result.ok).toBe(false);
  });

  it("approveAgent surfaces signature rejection", async () => {
    const signTypedDataAsync: SignTypedDataFn = async () => {
      throw new Error("user rejected");
    };
    const result = await postApproveAgent({
      network: "testnet",
      agentAddress: "0x2222222222222222222222222222222222222222",
      signTypedDataAsync,
      fetchImpl: mockFetch({ status: "ok" })
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/rejected/i);
  });
});

import { explainAgentRevokeLocalOnly, postRevokeBuilderFee } from "./exchange";

describe("hl revoke helpers (#190)", () => {
  it("postRevokeBuilderFee signs maxFeeRate 0%", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const signTypedDataAsync: SignTypedDataFn = async (args) =>
      wallet.signTypedData(
        args as Parameters<typeof wallet.signTypedData>[0]
      );
    const fetchImpl = mockFetch({ status: "ok" });
    const result = await postRevokeBuilderFee({
      network: "testnet",
      builder: "0x3333333333333333333333333333333333333333",
      signTypedDataAsync,
      fetchImpl
    });
    expect(result.ok).toBe(true);
    expect(
      (postedBody(fetchImpl).action as { maxFeeRate: string }).maxFeeRate
    ).toBe("0%");
  });

  it("explainAgentRevokeLocalOnly documents local clear", () => {
    expect(explainAgentRevokeLocalOnly()).toMatch(/cleared locally/i);
  });
});
