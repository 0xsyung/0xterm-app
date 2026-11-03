/**
 * @file networks.test.ts
 * @description V2 mainnet-only networks (#295)
 */
import { describe, expect, it } from "vitest";
import {
  V2_MAINNET_CHAINS,
  V2_MAINNET_IDS,
  isV2Mainnet,
  v2ChainById,
  v2ChainShortName
} from "./networks";

describe("V2 networks", () => {
  it("exposes exactly six mainnets and no testnets", () => {
    expect(V2_MAINNET_CHAINS).toHaveLength(6);
    expect(V2_MAINNET_IDS).toEqual([1, 42161, 8453, 137, 10, 999]);
    for (const c of V2_MAINNET_CHAINS) {
      expect(c.testnet).toBeFalsy();
      expect(isV2Mainnet(c.id)).toBe(true);
    }
    expect(isV2Mainnet(11155111)).toBe(false);
    expect(isV2Mainnet(998)).toBe(false);
    expect(isV2Mainnet(null)).toBe(false);
  });

  it("short names match Design chips", () => {
    expect(v2ChainShortName(1)).toBe("ETH");
    expect(v2ChainShortName(42161)).toBe("ARB");
    expect(v2ChainShortName(8453)).toBe("BASE");
    expect(v2ChainShortName(137)).toBe("POLYGON");
    expect(v2ChainShortName(10)).toBe("OP");
    expect(v2ChainShortName(999)).toBe("HYPE");
    expect(v2ChainById(8453)?.id).toBe(8453);
  });
});
