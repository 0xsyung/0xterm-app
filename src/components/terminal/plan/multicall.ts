/**
 * @file multicall.ts
 * @description Optional same-chain Multicall3 pack for plan run (#242 Soft ACK)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  encodeFunctionData,
  getAddress,
  parseAbi,
  type Address,
  type Hex
} from "viem";
import type { PlanStep } from "./types";
import { stepChainLabel, stepSummary } from "./summary";

/**
 * Canonical Multicall3 (makerdao /mds1). Same address on ETH / L2s / testnets
 * we ship in DEX/network registry. Not claimed on HyperEVM (999/998).
 * Confirmed packs encode to this `to` — never SwapRouter02.multicall.
 */
export const MULTICALL3_ADDRESS =
  "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

/** Chain ids with documented Multicall3 at the canonical address. */
export const MULTICALL3_BY_CHAIN: Readonly<Record<number, Address>> = {
  1: MULTICALL3_ADDRESS,
  10: MULTICALL3_ADDRESS,
  137: MULTICALL3_ADDRESS,
  8453: MULTICALL3_ADDRESS,
  42161: MULTICALL3_ADDRESS,
  11155111: MULTICALL3_ADDRESS,
  11155420: MULTICALL3_ADDRESS,
  84532: MULTICALL3_ADDRESS,
  421614: MULTICALL3_ADDRESS,
  80002: MULTICALL3_ADDRESS
};

export const multicall3Abi = parseAbi([
  // Call3 — no native value forwarding (v1 safe path)
  "function aggregate3((address target, bool allowFailure, bytes callData)[]) payable returns ((bool success, bytes returnData)[])"
]);

export type PackCall = {
  target: Address;
  allowFailure: false;
  callData: Hex;
  /** Always 0 in v1 packs — native-value steps are ineligible. */
  value: 0n;
  stepIndex: number;
  kind: PlanStep["kind"];
  summary: string;
};

export type PackIneligibleReason =
  | "poly_eip712"
  | "poly_wrap"
  | "native_value"
  | "no_multicall3"
  | "cross_chain"
  | "unsupported_kind";

export const PACK_INELIGIBLE_COPY: Record<PackIneligibleReason, string> = {
  poly_eip712:
    "poly / EIP-712 CLOB cannot pack into Multicall3 — falling back to per-step confirm (never fake multicall success).",
  poly_wrap:
    "poly wrap/unwrap uses native / collateral paths — out of pack; per-step confirm.",
  native_value:
    "native ETH value cannot safely forward via Multicall3 aggregate3 in v1 — out of pack; per-step confirm.",
  no_multicall3:
    "No documented Multicall3 on this chain — refuse pack; per-step confirm.",
  cross_chain:
    "Cross-chain consecutive steps — refuse pack (out of scope). Per-step / switch chain.",
  unsupported_kind: "Step kind cannot encode as Multicall3 call — per-step confirm."
};

export function multicall3ForChain(chainId: number): Address | null {
  const a = MULTICALL3_BY_CHAIN[chainId];
  return a ? getAddress(a) : null;
}

export function stepChainId(step: PlanStep): number | null {
  if (step.kind === "poly-wrap" || step.kind === "poly-unwrap") return 137;
  if ("chainId" in step) return step.chainId;
  return null;
}

/**
 * Static eligibility before rebuild. Native-value / poly decided after rebuild
 * when value is known; kind-level refuses happen here.
 */
export function ineligibleReason(
  step: PlanStep,
  opts?: { rebuiltValue?: bigint }
): PackIneligibleReason | null {
  if (step.kind === "poly") return "poly_eip712";
  if (step.kind === "poly-wrap" || step.kind === "poly-unwrap") return "poly_wrap";
  if (step.kind !== "swap" && step.kind !== "vault" && step.kind !== "approve") {
    return "unsupported_kind";
  }
  const chainId = stepChainId(step);
  if (chainId == null) return "unsupported_kind";
  if (!multicall3ForChain(chainId)) return "no_multicall3";
  if (step.kind === "swap" && step.from.isNative) return "native_value";
  if (opts?.rebuiltValue != null && opts.rebuiltValue > 0n) return "native_value";
  return null;
}

/**
 * Walk pending steps from `fromIdx`; return maximal consecutive same-chain
 * eligible run. Stops (does not skip) at first ineligible / chain break —
 * never silent-skip.
 */
export function collectEligiblePack(
  steps: PlanStep[],
  fromIdx: number
): {
  indices: number[];
  chainId: number | null;
  breakReason: PackIneligibleReason | null;
  breakIndex: number | null;
} {
  const indices: number[] = [];
  let chainId: number | null = null;
  let breakReason: PackIneligibleReason | null = null;
  let breakIndex: number | null = null;

  for (let i = fromIdx; i < steps.length; i++) {
    const s = steps[i]!;
    if (s.status !== "pending") continue;
    const cid = stepChainId(s);
    if (cid == null) {
      breakReason = "unsupported_kind";
      breakIndex = i;
      break;
    }
    if (chainId == null) chainId = cid;
    else if (cid !== chainId) {
      breakReason = "cross_chain";
      breakIndex = i;
      break;
    }
    const why = ineligibleReason(s);
    if (why) {
      breakReason = why;
      breakIndex = i;
      break;
    }
    indices.push(i);
  }

  return { indices, chainId, breakReason, breakIndex };
}

export function encodeAggregate3(calls: PackCall[]): Hex {
  return encodeFunctionData({
    abi: multicall3Abi,
    functionName: "aggregate3",
    args: [
      calls.map((c) => ({
        target: c.target,
        allowFailure: false as const,
        callData: c.callData
      }))
    ]
  });
}

export function buildMulticallTx(
  chainId: number,
  calls: PackCall[]
): { to: Address; data: Hex; value: 0n } {
  const to = multicall3ForChain(chainId);
  if (!to) {
    throw new Error(PACK_INELIGIBLE_COPY.no_multicall3);
  }
  if (calls.length === 0) throw new Error("empty multicall pack");
  // Atomic abort: allowFailure=false on every call.
  return {
    to,
    data: encodeAggregate3(calls),
    value: 0n
  };
}

export function packConfirmCopy(n: number): string {
  return `one wallet confirm for ${n} same-chain calls`;
}

export function truncateAddr(addr: string, left = 6, right = 4): string {
  const a = getAddress(addr as Address);
  return `${a.slice(0, left)}…${a.slice(-right)}`;
}

export function packCallSummary(step: PlanStep, valueWei: bigint): string {
  const v =
    valueWei > 0n ? ` value=${valueWei.toString()}` : " value=0";
  return `${step.kind} · ${stepSummary(step)}${v}`;
}

export { stepChainLabel, stepSummary };

/** True when any packed call's target/callData changed on re-sim (PLAN_DRIFT). */
export function packCallsDrifted(
  prev: PackCall[],
  next: PackCall[]
): { drifted: false } | { drifted: true; stepIndex: number; reason: string } {
  if (prev.length !== next.length) {
    return {
      drifted: true,
      stepIndex: prev[0]?.stepIndex ?? 0,
      reason: `pack size ${prev.length} → ${next.length}`
    };
  }
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i]!;
    const b = next[i]!;
    if (a.stepIndex !== b.stepIndex) {
      return { drifted: true, stepIndex: a.stepIndex, reason: "pack order changed" };
    }
    if (a.target.toLowerCase() !== b.target.toLowerCase() || a.callData !== b.callData) {
      return {
        drifted: true,
        stepIndex: a.stepIndex,
        reason: "pack step calldata drifted on re-sim"
      };
    }
  }
  return { drifted: false };
}
