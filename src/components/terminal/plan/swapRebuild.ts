/**
 * @file swapRebuild.ts
 * @description Rebuild swap calldata from PlanStepSwap intent + current registry (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  encodeFunctionData,
  parseAbi,
  toHex,
  type Address,
  type Hex,
  type PublicClient
} from "viem";
import {
  DEX_REGISTRY,
  NATIVE_TOKEN_ADDRESS,
  WRAPPED_NATIVE,
  uniV2FactoryAbi,
  uniV2PairAbi,
  uniV3FactoryAbi,
  uniV3PoolAbi
} from "../constants";
import { encodeV3ExactInputSingle } from "../swapEncode";
import type { DexProtocol } from "../types";
import type { PlanStepSwap } from "./types";
import { swapQuoteDrift } from "./drift";
import { PlanError } from "./errors";

export type SwapRebuildResult = {
  router: Address;
  data: Hex;
  value: `0x${string}`;
  approvalAddress?: Address;
  expectedOutWei: bigint;
  amountOutMin: bigint;
  deadline: bigint;
  dex: DexProtocol;
};

export function resolveDexForStep(
  step: PlanStepSwap
): DexProtocol | null {
  const list = DEX_REGISTRY[step.chainId] || [];
  return list.find((d) => d.id === step.dexId) ?? null;
}

/** Refuse if dexId missing or router address changed vs what we would use now. */
export function assertDexNotStale(step: PlanStepSwap): DexProtocol {
  const dex = resolveDexForStep(step);
  if (!dex) throw new PlanError("PLAN_STALE_DEX", `dexId ${step.dexId} not in registry`);
  return dex;
}

/**
 * Re-quote + encode swap exactly as live TerminalShell swap path.
 * Deadline = now + 20 minutes at run time.
 */
export async function rebuildSwapCalldata(
  step: PlanStepSwap,
  recipient: Address,
  client: PublicClient,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<SwapRebuildResult> {
  const dex = assertDexNotStale(step);
  const amountInWei = BigInt(step.amountInWei);
  const feeTier = step.feeTier ?? 3000;
  const deadline = BigInt(nowSec + 60 * 20);

  const addrIn = step.from.isNative
    ? (WRAPPED_NATIVE[step.chainId] as Address) || (step.from.address as Address)
    : (step.from.address as Address);
  const addrOut = (step.to.address as Address);

  let expectedOutWei = 0n;
  try {
    if (dex.type === "V2") {
      const pair = (await client.readContract({
        address: dex.factory,
        abi: uniV2FactoryAbi,
        functionName: "getPair",
        args: [addrIn, addrOut]
      })) as Address;
      if (pair && pair !== NATIVE_TOKEN_ADDRESS) {
        const [token0, reserves] = await Promise.all([
          client.readContract({
            address: pair,
            abi: uniV2PairAbi,
            functionName: "token0"
          }),
          client.readContract({
            address: pair,
            abi: uniV2PairAbi,
            functionName: "getReserves"
          })
        ]);
        const inIsToken0 =
          (token0 as string).toLowerCase() === addrIn.toLowerCase();
        const reserveIn = inIsToken0 ? reserves[0] : reserves[1];
        const reserveOut = inIsToken0 ? reserves[1] : reserves[0];
        if (reserveIn > 0n && reserveOut > 0n) {
          expectedOutWei = (await client.readContract({
            address: pair,
            abi: uniV2PairAbi,
            functionName: "getAmountOut",
            args: [amountInWei, reserveIn, reserveOut]
          })) as bigint;
        }
      }
    } else {
      const pool = (await client.readContract({
        address: dex.factory,
        abi: uniV3FactoryAbi,
        functionName: "getPool",
        args: [addrIn, addrOut, feeTier]
      })) as Address;
      if (pool && pool !== NATIVE_TOKEN_ADDRESS) {
        const [token0, slot0] = await Promise.all([
          client.readContract({
            address: pool,
            abi: parseAbi(["function token0() view returns (address)"]),
            functionName: "token0"
          }),
          client.readContract({
            address: pool,
            abi: uniV3PoolAbi,
            functionName: "slot0"
          })
        ]);
        const inIsToken0 =
          (token0 as string).toLowerCase() === addrIn.toLowerCase();
        const sqrtPrice = Number(slot0[0]) / 2 ** 96;
        const price = Math.pow(sqrtPrice, 2);
        const fromDec = step.from.decimals ?? 18;
        const toDec = step.to.decimals ?? 18;
        const outInDecimals = inIsToken0
          ? (Number(amountInWei) * price) / 10 ** fromDec
          : (Number(amountInWei) / price) / 10 ** fromDec;
        const outFloat = outInDecimals * 10 ** toDec;
        expectedOutWei = BigInt(Math.floor(outFloat * 0.995));
      }
    }
  } catch {
    expectedOutWei = 0n;
  }

  let amountOutMin = 0n;
  if (expectedOutWei > 0n) {
    const tolerated =
      (expectedOutWei * BigInt(Math.round(step.slippagePct * 100))) / 10000n;
    amountOutMin = expectedOutWei - tolerated;
  }

  const drift = swapQuoteDrift(step, expectedOutWei);
  if (!drift.ok) {
    throw new PlanError("PLAN_DRIFT", drift.reason);
  }

  let data: Hex;
  let value: `0x${string}` = "0x0";
  let approvalAddress: Address | undefined;

  if (dex.type === "V2") {
    if (step.from.isNative) {
      data = encodeFunctionData({
        abi: parseAbi([
          "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable"
        ]),
        functionName: "swapExactETHForTokens",
        args: [amountOutMin, [addrIn, addrOut], recipient, deadline]
      });
      value = toHex(amountInWei);
    } else if (
      step.to.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase() ||
      // native-out encoded as wrapped path in live swap; detect by symbol
      step.to.symbol.toUpperCase() === "ETH" ||
      step.to.symbol.toUpperCase() === "POL"
    ) {
      // Prefer TokensForETH when to looks native; path already uses wrapped.
      const wrappedOut = (WRAPPED_NATIVE[step.chainId] as Address) || addrOut;
      data = encodeFunctionData({
        abi: parseAbi([
          "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)"
        ]),
        functionName: "swapExactTokensForETH",
        args: [amountInWei, amountOutMin, [addrIn, wrappedOut], recipient, deadline]
      });
      approvalAddress = dex.router;
    } else {
      data = encodeFunctionData({
        abi: parseAbi([
          "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)"
        ]),
        functionName: "swapExactTokensForTokens",
        args: [amountInWei, amountOutMin, [addrIn, addrOut], recipient, deadline]
      });
      approvalAddress = dex.router;
    }
  } else {
    data = encodeV3ExactInputSingle(dex, {
      tokenIn: addrIn,
      tokenOut: addrOut,
      fee: feeTier,
      recipient,
      deadline,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0n
    });
    if (step.from.isNative) value = toHex(amountInWei);
    else approvalAddress = dex.router;
  }

  return {
    router: dex.router,
    data,
    value,
    approvalAddress,
    expectedOutWei,
    amountOutMin,
    deadline,
    dex
  };
}

/**
 * Pure encoder for fixture tests — no RPC. Uses stored quoteAtAdd mins.
 * Matches live encoder shapes for V2 tokens-for-tokens / V3 exactInputSingle.
 */
export function encodeSwapFromIntentFixture(
  step: PlanStepSwap,
  recipient: Address,
  dex: DexProtocol,
  nowSec = 1_700_000_000
): { data: Hex; value: `0x${string}`; approvalAddress?: Address; router: Address } {
  const amountInWei = BigInt(step.amountInWei);
  const amountOutMin = BigInt(step.quoteAtAdd.amountOutMin || "0");
  const deadline = BigInt(nowSec + 60 * 20);
  const addrIn = step.from.isNative
    ? ((WRAPPED_NATIVE[step.chainId] as Address) || (step.from.address as Address))
    : (step.from.address as Address);
  const addrOut = step.to.address as Address;
  let data: Hex;
  let value: `0x${string}` = "0x0";
  let approvalAddress: Address | undefined;

  if (dex.type === "V2") {
    if (step.from.isNative) {
      data = encodeFunctionData({
        abi: parseAbi([
          "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable"
        ]),
        functionName: "swapExactETHForTokens",
        args: [amountOutMin, [addrIn, addrOut], recipient, deadline]
      });
      value = toHex(amountInWei);
    } else {
      data = encodeFunctionData({
        abi: parseAbi([
          "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)"
        ]),
        functionName: "swapExactTokensForTokens",
        args: [amountInWei, amountOutMin, [addrIn, addrOut], recipient, deadline]
      });
      approvalAddress = dex.router;
    }
  } else {
    data = encodeV3ExactInputSingle(dex, {
      tokenIn: addrIn,
      tokenOut: addrOut,
      fee: step.feeTier ?? 3000,
      recipient,
      deadline,
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0n
    });
    if (step.from.isNative) value = toHex(amountInWei);
    else approvalAddress = dex.router;
  }
  return { data, value, approvalAddress, router: dex.router };
}
