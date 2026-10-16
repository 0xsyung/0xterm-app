/**
 * @file signing.test.ts
 * @description L1 hash + signature split + order wire (#190)
 */
import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  buildCancelAction,
  buildOrderAction,
  buildUpdateLeverageAction,
  buildUsdClassTransferAction,
  buildWithdrawAction,
  createL1ActionHash,
  nextNonce,
  resetNonceGuard,
  signL1Action,
  splitSignature,
  stripTrailingZeros,
  recoverTypedDataSigner,
  userSignedTypedData,
  WithdrawTypes
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

  it("buildUpdateLeverageAction matches schema order", () => {
    const action = buildUpdateLeverageAction({
      asset: 2,
      leverage: 10,
      isCross: true
    });
    expect(action).toEqual({
      type: "updateLeverage",
      asset: 2,
      isCross: true,
      leverage: 10
    });
  });

  it("buildWithdrawAction includes signature chain + lowercased destination", () => {
    const action = buildWithdrawAction({
      network: "testnet",
      amount: "100",
      destination: "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      time: 1700000000000
    });
    expect(action.type).toBe("withdraw3");
    expect(action.hyperliquidChain).toBe("Testnet");
    expect(action.signatureChainId).toBe("0x66eee");
    expect(action.destination).toBe(
      "0xabcdef0123456789abcdef0123456789abcdef01"
    );
    expect(action.time).toBe(1700000000000);
  });

  it("buildUsdClassTransferAction carries toPerp + nonce", () => {
    const action = buildUsdClassTransferAction({
      network: "mainnet",
      amount: "50",
      toPerp: true,
      nonce: 1700000000000
    });
    expect(action.type).toBe("usdClassTransfer");
    expect(action.hyperliquidChain).toBe("Mainnet");
    expect(action.toPerp).toBe(true);
    expect(action.nonce).toBe(1700000000000);
  });

  it("userSignedTypedData passes the FULL action as message (no filter)", () => {
    const action = buildWithdrawAction({
      network: "testnet",
      amount: "10",
      destination: "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      time: 1700000000000
    });
    const td = userSignedTypedData(
      "testnet",
      WithdrawTypes,
      "HyperliquidTransaction:Withdraw",
      action
    );
    // Domain chainId is 0x66eee for both networks (SDK constant).
    expect(td.domain.chainId).toBe(0x66eee);
    expect(td.message).toEqual(action);
    // All declared fields survive even though the message is the full action.
    expect(td.types["HyperliquidTransaction:Withdraw"]).toHaveLength(4);
  });

  it("recoverTypedDataSigner recovers the signing account", async () => {
    const wallet = privateKeyToAccount(generatePrivateKey());
    const action = buildWithdrawAction({
      network: "testnet",
      amount: "10",
      destination: "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      time: 1700000000000
    });
    const td = userSignedTypedData(
      "testnet",
      WithdrawTypes,
      "HyperliquidTransaction:Withdraw",
      action
    );
    const sig = await wallet.signTypedData(td as never);
    const recovered = await recoverTypedDataSigner(td, sig);
    expect(recovered?.toLowerCase()).toBe(wallet.address.toLowerCase());
  });
});
