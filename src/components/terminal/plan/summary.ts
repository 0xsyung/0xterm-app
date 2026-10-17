/**
 * @file summary.ts
 * @description Human step summaries for plan show (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { PlanStep } from "./types";

export function stepSummary(step: PlanStep): string {
  switch (step.kind) {
    case "swap":
      return `swap ${step.amountInHuman} ${step.from.symbol} → ${step.to.symbol} (${step.dexId}, ${step.slippagePct}%)`;
    case "vault":
      return `vault ${step.op} ${step.amountHuman} @ ${truncate(step.vault)}`;
    case "poly":
      return `poly ${step.op} ${step.amountHuman} ${step.outcome}${step.limitPrice ? ` @ ${step.limitPrice}` : ""}`;
    case "approve":
      return step.amountWei === "0"
        ? `approve revoke ${truncate(step.token)} → ${truncate(step.spender)}`
        : `approve ${truncate(step.token)} → ${truncate(step.spender)}`;
    case "poly-wrap":
      return `poly wrap ${step.amountWei} wei`;
    case "poly-unwrap":
      return `poly unwrap ${step.amountWei} wei`;
    default:
      return "unknown step";
  }
}

export function stepChainLabel(step: PlanStep): string {
  if (step.kind === "poly-wrap" || step.kind === "poly-unwrap") return "137";
  if ("chainId" in step) return String(step.chainId);
  return "—";
}

export function lastSimLabel(step: PlanStep): "ok" | "drift" | "unsimmed" | "error" {
  if (!step.lastSim) return "unsimmed";
  if (step.lastSim.ok) return "ok";
  if (step.lastSim.reason?.toLowerCase().includes("drift")) return "drift";
  return "error";
}

function truncate(addr: string, left = 6, right = 4): string {
  if (!addr || addr.length < left + right + 2) return addr || "—";
  return `${addr.slice(0, left)}…${addr.slice(-right)}`;
}
