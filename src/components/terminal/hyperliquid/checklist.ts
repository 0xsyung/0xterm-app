/**
 * @file checklist.ts
 * @description PERPS onboarding checklist unlock logic (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type ChecklistState = {
  walletConnected: boolean;
  agentApproved: boolean;
  builderApproved: boolean;
};

export type ChecklistStepId = "agent" | "builder";

export function isChecklistComplete(state: ChecklistState): boolean {
  return (
    state.walletConnected && state.agentApproved && state.builderApproved
  );
}

export function checklistSteps(state: ChecklistState): {
  id: ChecklistStepId;
  done: boolean;
}[] {
  return [
    { id: "agent", done: state.agentApproved },
    { id: "builder", done: state.builderApproved }
  ];
}

/** Locked copy — Stephy Design soft ACK. */
export const PERPS_COPY = {
  walletOff: "Connect wallet to trade perps.",
  explainer:
    "Trade Hyperliquid perps. 0xterm earns a small builder fee — you approve a max once.",
  connectCta: "CONNECT HYPERLIQUID",
  approveFeeCta: "APPROVE 0XTERM FEE",
  unlockHint: "Order form unlocks when both steps are done.",
  noAgent: "No agent connected",
  noBuilder: "No builder fee approved",
  noPositions: "No open positions",
  noOrders: "No open orders",
  settingsHint:
    "Builder fee, agent, and approvals. Keys stay in-browser — no export.",
  leverageConfirm: (n: number) => `Confirm leverage ${n}×?`
} as const;

export function maxFeeSubcopy(feePercent: string): string {
  return `Max fee ${feePercent}`;
}
