/**
 * @file exchange.test.ts
 * @description /exchange posts with mocked fetch + local agent (#190)
 */
import { describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  ensureBuilderApproved,
  marketOrderPx,
  postCancelWithAgent,
  postOrderWithAgent,
  postApproveAgent,
  postApproveBuilderFee,
  postUserSignedAction
} from "./exchange";
import {
  buildUsdClassTransferAction,
  buildWithdrawAction,
  UsdClassTransferTypes,
  WithdrawTypes
} from "./signing";
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

  it("postApproveAgent rejects a recovered signer mismatch without posting", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const signTypedDataAsync: SignTypedDataFn = async (args) =>
      wallet.signTypedData(args as Parameters<typeof wallet.signTypedData>[0]);
    const fetchImpl = mockFetch({ status: "ok" });
    // expectedSigner is a DIFFERENT address than the one actually signing.
    const result = await postApproveAgent({
      network: "testnet",
      agentAddress: "0x2222222222222222222222222222222222222222",
      expectedSigner: "0x4444444444444444444444444444444444444444",
      signTypedDataAsync,
      fetchImpl
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not the connected account/);
    expect(fetchImpl.mock.calls.length).toBe(0); // nothing posted
  });

  it("postApproveAgent posts when recovered signer matches", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const signTypedDataAsync: SignTypedDataFn = async (args) =>
      wallet.signTypedData(args as Parameters<typeof wallet.signTypedData>[0]);
    const fetchImpl = mockFetch({ status: "ok" });
    const result = await postApproveAgent({
      network: "testnet",
      agentAddress: "0x2222222222222222222222222222222222222222",
      expectedSigner: wallet.address,
      signTypedDataAsync,
      fetchImpl
    });
    expect(result.ok).toBe(true);
    expect(fetchImpl.mock.calls.length).toBe(1);
  });

  it("postUserSignedAction uses action.time as the outer nonce for withdraw3", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const signTypedDataAsync: SignTypedDataFn = async (args) =>
      wallet.signTypedData(args as Parameters<typeof wallet.signTypedData>[0]);
    const fetchImpl = mockFetch({ status: "ok" });
    const action = buildWithdrawAction({
      network: "testnet",
      amount: "10",
      destination: "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      time: 1700000000000
    });
    const result = await postUserSignedAction({
      network: "testnet",
      expectedSigner: wallet.address,
      action,
      types: WithdrawTypes,
      primaryType: "HyperliquidTransaction:Withdraw",
      signTypedDataAsync,
      fetchImpl
    });
    expect(result.ok).toBe(true);
    expect(postedBody(fetchImpl).nonce).toBe(1700000000000);
  });

  it("postUserSignedAction uses action.nonce for usdClassTransfer", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const signTypedDataAsync: SignTypedDataFn = async (args) =>
      wallet.signTypedData(args as Parameters<typeof wallet.signTypedData>[0]);
    const fetchImpl = mockFetch({ status: "ok" });
    const action = buildUsdClassTransferAction({
      network: "mainnet",
      amount: "50",
      toPerp: true,
      nonce: 1700000000000
    });
    const result = await postUserSignedAction({
      network: "mainnet",
      expectedSigner: wallet.address,
      action,
      types: UsdClassTransferTypes,
      primaryType: "HyperliquidTransaction:UsdClassTransfer",
      signTypedDataAsync,
      fetchImpl
    });
    expect(result.ok).toBe(true);
    expect(postedBody(fetchImpl).nonce).toBe(1700000000000);
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

describe("hl builder + market px (#190)", () => {
  it("ensureBuilderApproved returns the builder when maxBuilderFee registers", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const signTypedDataAsync: SignTypedDataFn = async (args) =>
      wallet.signTypedData(args as Parameters<typeof wallet.signTypedData>[0]);
    // First /info maxBuilderFee call returns 0 (unregistered) → approve posted;
    // re-read then returns 20 tenths (registered).
    let calls = 0;
    const fetchImpl = vi.fn(async (url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String((init as { body?: string })?.body ?? "{}"));
      if (body.type === "maxBuilderFee") {
        calls++;
        const value = calls === 1 ? 0 : 20;
        return { ok: true, status: 200, json: async () => value };
      }
      return { ok: true, status: 200, json: async () => ({ status: "ok" }) };
    }) as unknown as typeof fetch;

    const param = await ensureBuilderApproved({
      network: "testnet",
      masterAddress: wallet.address,
      builder: "0x1111111111111111111111111111111111111111",
      feeTenths: 20,
      maxFeeBp: 2,
      expectedSigner: wallet.address,
      signTypedDataAsync,
      fetchImpl
    });
    expect(param).toEqual({ b: "0x1111111111111111111111111111111111111111", f: 20 });
  });

  it("ensureBuilderApproved returns undefined when fee never registers (phantom ok)", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const signTypedDataAsync: SignTypedDataFn = async (args) =>
      wallet.signTypedData(args as Parameters<typeof wallet.signTypedData>[0]);
    const fetchImpl = vi.fn(async (url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String((init as { body?: string })?.body ?? "{}"));
      if (body.type === "maxBuilderFee") {
        return { ok: true, status: 200, json: async () => 0 };
      }
      return { ok: true, status: 200, json: async () => ({ status: "ok" }) };
    }) as unknown as typeof fetch;

    const param = await ensureBuilderApproved({
      network: "testnet",
      masterAddress: wallet.address,
      builder: "0x1111111111111111111111111111111111111111",
      feeTenths: 20,
      maxFeeBp: 2,
      expectedSigner: wallet.address,
      signTypedDataAsync,
      fetchImpl
    });
    expect(param).toBeUndefined();
  });

  it("marketOrderPx slips 5% past mid and keeps tick-safe precision", () => {
    expect(marketOrderPx("100", true)).toBe("105");
    expect(marketOrderPx("100", false)).toBe("95");
    expect(marketOrderPx("64123.456789", true)).toMatch(/^\d+(\.\d+)?$/);
    const short = marketOrderPx("64123.456789", false);
    expect(Number(short)).toBeLessThan(64123.456789);
  });
});
