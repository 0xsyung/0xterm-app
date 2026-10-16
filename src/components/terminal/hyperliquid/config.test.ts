/**
 * @file config.test.ts
 * @description HL network + builder address config (#190)
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  HL_BUILDER_ADDRESS_PLACEHOLDER,
  HL_DEFAULT_NETWORK,
  HL_DEPOSIT,
  hlApiBase,
  hlEvmChainId,
  hlSignatureChainId,
  isBuilderAddressConfigured,
  networkFromEvmChainId,
  resolveBuilderAddress
} from "./config";

describe("hl config (#190)", () => {
  const prevBuilder = process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS;

  afterEach(() => {
    if (prevBuilder === undefined) {
      delete process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS;
    } else {
      process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS = prevBuilder;
    }
  });

  it("defaults to testnet", () => {
    expect(HL_DEFAULT_NETWORK).toBe("testnet");
    expect(hlApiBase("testnet")).toContain("testnet");
    expect(hlEvmChainId("testnet")).toBe(998);
    expect(hlSignatureChainId("testnet")).toBe(0x66eee);
  });

  it("signs user-signed actions over 0x66eee on BOTH networks (SDK constant)", () => {
    expect(hlSignatureChainId("mainnet")).toBe(0x66eee);
    expect(hlSignatureChainId("testnet")).toBe(0x66eee);
  });

  it("deposit targets map per network (Arbitrum One / Arbitrum Sepolia)", () => {
    expect(HL_DEPOSIT.mainnet.chainId).toBe(0xa4b1);
    expect(HL_DEPOSIT.mainnet.usdcAddress).toBe(
      "0xaf88d065e77c8cc2239327c5edb3a432268e5831"
    );
    expect(HL_DEPOSIT.mainnet.bridgeAddress).toBe(
      "0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7"
    );
    expect(HL_DEPOSIT.testnet.chainId).toBe(0x66eee);
    expect(HL_DEPOSIT.testnet.usdcAddress).toBe(
      "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
    );
    expect(HL_DEPOSIT.testnet.bridgeAddress).toBe(
      "0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89"
    );
  });

  it("maps EVM chain ids", () => {
    expect(networkFromEvmChainId(999)).toBe("mainnet");
    expect(networkFromEvmChainId(1)).toBe("testnet");
  });

  it("resolves builder from env override or placeholder", () => {
    expect(resolveBuilderAddress({})).toBe(HL_BUILDER_ADDRESS_PLACEHOLDER);
    expect(
      resolveBuilderAddress({
        NEXT_PUBLIC_HL_BUILDER_ADDRESS:
          "0x1111111111111111111111111111111111111111"
      })
    ).toBe("0x1111111111111111111111111111111111111111");
    expect(isBuilderAddressConfigured(HL_BUILDER_ADDRESS_PLACEHOLDER)).toBe(
      false
    );
  });

  it("reads static process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS when no override", () => {
    process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS =
      "0x2222222222222222222222222222222222222222";
    expect(resolveBuilderAddress()).toBe(
      "0x2222222222222222222222222222222222222222"
    );
    expect(isBuilderAddressConfigured()).toBe(true);

    delete process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS;
    expect(resolveBuilderAddress()).toBe(HL_BUILDER_ADDRESS_PLACEHOLDER);
    expect(isBuilderAddressConfigured()).toBe(false);
  });
});
