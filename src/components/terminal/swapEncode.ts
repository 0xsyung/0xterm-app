/**
 * @file swapEncode.ts
 * @description Pure Uniswap V3 exactInputSingle calldata builder, router-version aware (#154)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { encodeFunctionData, type Address, type Hex } from "viem";
import { uniV3RouterAbi, uniV3SwapRouter02Abi } from "./constants";
import type { DexProtocol, V3RouterVersion } from "./types";

export type V3ExactInputSingleArgs = {
  tokenIn: Address;
  tokenOut: Address;
  fee: number;
  recipient: Address;
  deadline: bigint;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96?: bigint;
};

/**
 * Router version for a V3 DEX entry. Entries without a tag keep the pre-#154
 * behaviour (original SwapRouter ABI); every V3 DEX_REGISTRY entry is tagged.
 */
export function v3RouterVersion(dex: Pick<DexProtocol, "routerVersion">): V3RouterVersion {
  return dex.routerVersion ?? "swapRouter";
}

/**
 * Encode a V3 exact-input single-hop swap for `dex.router`.
 * - swapRouter:   exactInputSingle((tokenIn,tokenOut,fee,recipient,deadline,amountIn,amountOutMinimum,sqrtPriceLimitX96))
 * - swapRouter02: multicall(deadline, [exactInputSingle((tokenIn,tokenOut,fee,recipient,amountIn,amountOutMinimum,sqrtPriceLimitX96))])
 *   SwapRouter02's struct has no deadline, so it is enforced via the
 *   deadline-checked multicall overload instead.
 */
export function encodeV3ExactInputSingle(
  dex: Pick<DexProtocol, "routerVersion">,
  args: V3ExactInputSingleArgs
): Hex {
  const sqrtPriceLimitX96 = args.sqrtPriceLimitX96 ?? 0n;
  if (v3RouterVersion(dex) === "swapRouter02") {
    const inner = encodeFunctionData({
      abi: uniV3SwapRouter02Abi,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn: args.tokenIn,
          tokenOut: args.tokenOut,
          fee: args.fee,
          recipient: args.recipient,
          amountIn: args.amountIn,
          amountOutMinimum: args.amountOutMinimum,
          sqrtPriceLimitX96
        }
      ]
    });
    return encodeFunctionData({
      abi: uniV3SwapRouter02Abi,
      functionName: "multicall",
      args: [args.deadline, [inner]]
    });
  }
  return encodeFunctionData({
    abi: uniV3RouterAbi,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: args.tokenIn,
        tokenOut: args.tokenOut,
        fee: args.fee,
        recipient: args.recipient,
        deadline: args.deadline,
        amountIn: args.amountIn,
        amountOutMinimum: args.amountOutMinimum,
        sqrtPriceLimitX96
      }
    ]
  });
}
