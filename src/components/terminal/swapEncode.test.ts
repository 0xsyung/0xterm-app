/**
 * @file swapEncode.test.ts
 * @description V3 exactInputSingle encoder picks SwapRouter vs SwapRouter02 ABI per chain (#154)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it } from "vitest";
import { decodeFunctionData, toFunctionSelector, type Address, type Hex } from "viem";
import { DEX_REGISTRY, uniV3RouterAbi, uniV3SwapRouter02Abi } from "./constants";
import { encodeV3ExactInputSingle, v3RouterVersion } from "./swapEncode";
import type { DexProtocol } from "./types";

// Canonical Uniswap selectors (independent of our ABI strings).
const SEL_V1_EXACT_INPUT_SINGLE = "0x414bf389"; // exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))
const SEL_02_EXACT_INPUT_SINGLE = "0x04e45aaf"; // exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))
const SEL_02_MULTICALL_DEADLINE = "0x5ae401dc"; // multicall(uint256,bytes[])

const TOKEN_IN = "0x1111111111111111111111111111111111111111" as Address;
const TOKEN_OUT = "0x2222222222222222222222222222222222222222" as Address;
const RECIPIENT = "0x3333333333333333333333333333333333333333" as Address;
const ARGS = {
  tokenIn: TOKEN_IN,
  tokenOut: TOKEN_OUT,
  fee: 3000,
  recipient: RECIPIENT,
  deadline: 1_900_000_000n,
  amountIn: 10n ** 18n,
  amountOutMinimum: 123_456n,
  sqrtPriceLimitX96: 0n
};

const v3 = (chainId: number): DexProtocol => {
  const dex = DEX_REGISTRY[chainId]?.find((d) => d.type === "V3");
  if (!dex) throw new Error(`no V3 dex on ${chainId}`);
  return dex;
};

function expectSwapRouter02(data: Hex) {
  expect(data.slice(0, 10)).toBe(SEL_02_MULTICALL_DEADLINE);
  const outer = decodeFunctionData({ abi: uniV3SwapRouter02Abi, data });
  expect(outer.functionName).toBe("multicall");
  const [deadline, calls] = outer.args as readonly [bigint, readonly Hex[]];
  expect(deadline).toBe(ARGS.deadline);
  expect(calls).toHaveLength(1);
  expect(calls[0].slice(0, 10)).toBe(SEL_02_EXACT_INPUT_SINGLE);
  const inner = decodeFunctionData({ abi: uniV3SwapRouter02Abi, data: calls[0] });
  expect(inner.functionName).toBe("exactInputSingle");
  const params = (inner.args as readonly [Record<string, unknown>])[0];
  expect(Object.keys(params).sort()).toEqual(
    ["amountIn", "amountOutMinimum", "fee", "recipient", "sqrtPriceLimitX96", "tokenIn", "tokenOut"].sort()
  );
  expect(params).not.toHaveProperty("deadline");
  expect(params).toMatchObject({
    tokenIn: TOKEN_IN,
    tokenOut: TOKEN_OUT,
    fee: 3000,
    recipient: RECIPIENT,
    amountIn: ARGS.amountIn,
    amountOutMinimum: ARGS.amountOutMinimum,
    sqrtPriceLimitX96: 0n
  });
}

function expectOriginalSwapRouter(data: Hex) {
  expect(data.slice(0, 10)).toBe(SEL_V1_EXACT_INPUT_SINGLE);
  const decoded = decodeFunctionData({ abi: uniV3RouterAbi, data });
  expect(decoded.functionName).toBe("exactInputSingle");
  const params = (decoded.args as readonly [Record<string, unknown>])[0];
  expect(params).toMatchObject({
    tokenIn: TOKEN_IN,
    tokenOut: TOKEN_OUT,
    fee: 3000,
    recipient: RECIPIENT,
    deadline: ARGS.deadline,
    amountIn: ARGS.amountIn,
    amountOutMinimum: ARGS.amountOutMinimum,
    sqrtPriceLimitX96: 0n
  });
}

describe("V3 router ABI selectors (#154)", () => {
  it("our ABI strings hash to the canonical Uniswap selectors", () => {
    expect(
      toFunctionSelector("exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))")
    ).toBe(SEL_V1_EXACT_INPUT_SINGLE);
    expect(
      toFunctionSelector("exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))")
    ).toBe(SEL_02_EXACT_INPUT_SINGLE);
    expect(toFunctionSelector("multicall(uint256,bytes[])")).toBe(SEL_02_MULTICALL_DEADLINE);
  });
});

describe("DEX_REGISTRY V3 routerVersion (#154)", () => {
  const ORIGINAL = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  it("tags every V3 entry with a routerVersion", () => {
    for (const [chainId, dexes] of Object.entries(DEX_REGISTRY)) {
      for (const d of dexes.filter((x) => x.type === "V3")) {
        expect(d.routerVersion, `chain ${chainId} ${d.id}`).toMatch(/^swapRouter(02)?$/);
      }
    }
  });

  it("original SwapRouter address <=> 'swapRouter'", () => {
    for (const dexes of Object.values(DEX_REGISTRY)) {
      for (const d of dexes.filter((x) => x.type === "V3")) {
        expect(d.routerVersion === "swapRouter").toBe(d.router === ORIGINAL);
      }
    }
  });

  it.each([1, 42161, 137, 10])("chain %i uses the original SwapRouter", (chainId) => {
    expect(v3(chainId).routerVersion).toBe("swapRouter");
  });

  it.each([8453, 11155111, 84532, 11155420, 421614])("chain %i uses SwapRouter02", (chainId) => {
    expect(v3(chainId).routerVersion).toBe("swapRouter02");
  });

  it("untagged entries default to the original SwapRouter", () => {
    expect(v3RouterVersion({})).toBe("swapRouter");
  });
});

describe("encodeV3ExactInputSingle (#154)", () => {
  it("Base 8453 -> SwapRouter02 multicall(deadline, [exactInputSingle without deadline])", () => {
    expectSwapRouter02(encodeV3ExactInputSingle(v3(8453), ARGS));
  });

  it("Sepolia 11155111 -> SwapRouter02", () => {
    expectSwapRouter02(encodeV3ExactInputSingle(v3(11155111), ARGS));
  });

  it.each([84532, 11155420, 421614])("testnet %i -> SwapRouter02", (chainId) => {
    expectSwapRouter02(encodeV3ExactInputSingle(v3(chainId), ARGS));
  });

  it("Ethereum 1 -> original exactInputSingle with deadline (unchanged)", () => {
    expectOriginalSwapRouter(encodeV3ExactInputSingle(v3(1), ARGS));
  });

  it.each([42161, 137, 10])("chain %i -> original exactInputSingle with deadline", (chainId) => {
    expectOriginalSwapRouter(encodeV3ExactInputSingle(v3(chainId), ARGS));
  });

  it("defaults sqrtPriceLimitX96 to 0", () => {
    const { sqrtPriceLimitX96: _omit, ...rest } = ARGS;
    void _omit;
    expectOriginalSwapRouter(encodeV3ExactInputSingle(v3(1), rest));
    expectSwapRouter02(encodeV3ExactInputSingle(v3(8453), rest));
  });
});
