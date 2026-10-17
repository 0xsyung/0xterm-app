/**
 * @file types.ts
 * @description Saved plan intents — unsigned; rebuild calldata at run (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type PlanStepStatus = "pending" | "done" | "skipped";

export type PlanStepLastSim = {
  at: number;
  ok: boolean;
  reason?: string;
};

export type PlanStepBase = {
  id: string;
  status: PlanStepStatus;
  lastSim?: PlanStepLastSim;
  /** Receipt only when status=done — never an executable source. */
  txHash?: string;
  orderId?: string;
};

export type PlanTokenRef = {
  address: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
};

export type PlanStepSwap = PlanStepBase & {
  kind: "swap";
  chainId: number;
  dexId: string;
  from: PlanTokenRef;
  to: { address: string; symbol: string; decimals: number };
  amountInHuman: string;
  amountInWei: string;
  slippagePct: number;
  feeTier?: number;
  quoteAtAdd: {
    expectedOutWei: string;
    amountOutMin: string;
    quotedAt: number;
  };
};

export type PlanStepVault = PlanStepBase & {
  kind: "vault";
  op: "deposit" | "mint" | "withdraw" | "redeem";
  chainId: number;
  vault: string;
  amountHuman: string;
  amountWei: string;
  previewAtAdd: { outWei: string; quotedAt: number };
};

export type PlanStepPoly = PlanStepBase & {
  kind: "poly";
  op: "buy" | "sell";
  chainId: 137;
  conditionId: string;
  tokenId: string;
  outcome: string;
  side: "BUY" | "SELL";
  amountHuman: string;
  limitPrice?: string;
  tif: "GTC" | "FOK" | "FAK";
  bookAtAdd: { mid: string; tick: string; minSize: string; quotedAt: number };
};

export type PlanStepApprove = PlanStepBase & {
  kind: "approve";
  chainId: number;
  token: string;
  spender: string;
  amountWei: string;
};

export type PlanStepWrap = PlanStepBase & {
  kind: "poly-wrap" | "poly-unwrap";
  amountWei: string;
};

export type PlanStep =
  | PlanStepSwap
  | PlanStepVault
  | PlanStepPoly
  | PlanStepApprove
  | PlanStepWrap;

export type Plan = {
  v: 1;
  name: string;
  createdAt: number;
  updatedAt: number;
  steps: PlanStep[];
};

/** Session recording / run state (not persisted as secrets). */
export type PlanSession = {
  recording: boolean;
  recordingName: string | null;
  /** Active run — remaining steps stay pending on abort/reject. */
  runningName: string | null;
  /** Index into plan.steps for current run step (pending ones skipped over). */
  runCursor: number;
};
