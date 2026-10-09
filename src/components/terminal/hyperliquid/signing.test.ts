/**
 * @file signing.test.ts
 * @description L1 hash + signature split + order wire (#190)
 */
import { describe, expect, it } from "vitest";
import { generatePrivateKey } from "viem/accounts";
import {
  buildCancelAction,
  buildOrderAction,
  createL1ActionHash,
  nextNonce,
  resetNonceGuard,
  signL1Action,
  splitSignature,
  stripTrailingZeros
} from "./index";

describe("signing helpers (#190)", () => {
  it("createL1ActionHash is stable for a known cancel", () => {
    const action = buildCancelAction({ asset: 0, oid: 12345 });
    const hash = createL1ActionHash({ action, nonce: 1700000000000 });
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(createL1ActionHash({ action, nonce: 1700000000000 })).toBe(hash);
  });

  it("splitSignature normalizes v to 27/28", () => {
    const sig =
      ("0x" +
        "11".repeat(32) +
        "22".repeat(32) +
        "00") as `0x${string}`;
    const { v } = splitSignature(sig);
    expect(v).toBe(27);
  });

  it("nonce is strictly increasing", () => {
    resetNonceGuard();
    const a = nextNonce(1000);
    const b = nextNonce(1000);
    expect(b).toBeGreaterThan(a);
  });

  it("agent can sign L1 cancel locally", async () => {
    const pk = generatePrivateKey();
    const action = buildCancelAction({ asset: 0, oid: 1 });
    const sig = await signL1Action({
      privateKey: pk,
      action,
      nonce: Date.now(),
      network: "testnet"
    });
    expect(sig.r).toMatch(/^0x/);
    expect(sig.v === 27 || sig.v === 28).toBe(true);
  });

  it("order action includes builder b/f and stripped p/s", () => {
    const action = buildOrderAction({
      asset: 0,
      isBuy: true,
      price: stripTrailingZeros("100.0"),
      size: stripTrailingZeros("0.0100"),
      tif: "Ioc",
      builder: { b: "0x0000000000000000000000000000000000000001", f: 20 }
    });
    expect(action.type).toBe("order");
    const orders = action.orders as { p: string; s: string }[];
    const builder = action.builder as { f: number };
    expect(orders[0].p).toBe("100");
    expect(orders[0].s).toBe("0.01");
    expect(builder.f).toBe(20);
  });
});
