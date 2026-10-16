/**
 * @file index.ts
 * @description Polymarket / poly|pred public surface (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
export * from "./constants";
export * from "./session";
export * from "./order";
export * from "./gamma";
export * from "./clob";

import { encodeFunctionData, parseUnits, type Address } from "viem";
import {
  POLY_OFFRAMP,
  POLY_ONRAMP,
  POLY_PUSD,
  POLY_USDCE,
  erc20PolyAbi,
  polyOfframpAbi,
  polyOnrampAbi
} from "./constants";

export function encodeUsdceApproveOnramp(amountWei: bigint): {
  to: Address;
  data: `0x${string}`;
} {
  return {
    to: POLY_USDCE,
    data: encodeFunctionData({
      abi: erc20PolyAbi,
      functionName: "approve",
      args: [POLY_ONRAMP, amountWei]
    })
  };
}

export function encodeWrap(recipient: Address, amountWei: bigint): {
  to: Address;
  data: `0x${string}`;
} {
  return {
    to: POLY_ONRAMP,
    data: encodeFunctionData({
      abi: polyOnrampAbi,
      functionName: "wrap",
      args: [POLY_USDCE, recipient, amountWei]
    })
  };
}

export function encodePusdApproveOfframp(amountWei: bigint): {
  to: Address;
  data: `0x${string}`;
} {
  return {
    to: POLY_PUSD,
    data: encodeFunctionData({
      abi: erc20PolyAbi,
      functionName: "approve",
      args: [POLY_OFFRAMP, amountWei]
    })
  };
}

export function encodeUnwrap(recipient: Address, amountWei: bigint): {
  to: Address;
  data: `0x${string}`;
} {
  return {
    to: POLY_OFFRAMP,
    data: encodeFunctionData({
      abi: polyOfframpAbi,
      functionName: "unwrap",
      args: [POLY_USDCE, recipient, amountWei]
    })
  };
}

export function encodePusdApproveExchange(
  exchange: Address,
  amountWei: bigint
): { to: Address; data: `0x${string}` } {
  return {
    to: POLY_PUSD,
    data: encodeFunctionData({
      abi: erc20PolyAbi,
      functionName: "approve",
      args: [exchange, amountWei]
    })
  };
}

export function parsePolyAmount(raw: string): bigint | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    return parseUnits(s, 6);
  } catch {
    return null;
  }
}

export function truncateAddr(a: string, left = 6, right = 4): string {
  if (!a || a.length < left + right + 1) return a;
  return `${a.slice(0, left)}…${a.slice(-right)}`;
}

export function parsePolyFlags(args: string[]): {
  limit?: number;
  tif?: "GTC" | "FOK" | "FAK";
  rest: string[];
} {
  const rest: string[] = [];
  let limit: number | undefined;
  let tif: "GTC" | "FOK" | "FAK" | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--limit" && args[i + 1]) {
      limit = Number(args[++i]);
      continue;
    }
    if (a === "--tif" && args[i + 1]) {
      const v = args[++i].toUpperCase();
      if (v === "GTC" || v === "FOK" || v === "FAK") tif = v;
      continue;
    }
    rest.push(a);
  }
  return { limit, tif, rest };
}
