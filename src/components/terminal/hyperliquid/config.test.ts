/**
 * @file config.test.ts
 * @description HL network + builder address config (#190)
 */
import { describe, expect, it } from "vitest";
import {
  HL_BUILDER_ADDRESS_PLACEHOLDER,
  HL_DEFAULT_NETWORK,
  hlApiBase,
  hlEvmChainId,
  hlSignatureChainId,
  isBuilderAddressConfigured,
  networkFromEvmChainId,
  resolveBuilderAddress
} from "./config";

describe("hl config (#190)", () => {
  it("defaults to testnet", () => {
    expect(HL_DEFAULT_NETWORK).toBe("testnet");
    expect(hlApiBase("testnet")).toContain("testnet");
    expect(hlEvmChainId("testnet")).toBe(998);
    expect(hlSignatureChainId("testnet")).toBe(0x66eee);
  });

  it("maps EVM chain ids", () => {
    expect(networkFromEvmChainId(999)).toBe("mainnet");
    expect(networkFromEvmChainId(1)).toBe("testnet");
  });

  it("resolves builder from env or placeholder", () => {
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
});
