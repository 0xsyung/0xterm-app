/**
 * @file intent.ts
 * @description Classify plan-add commands; reject read-only (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { PLAN_PAYABLE_ROOTS, PLAN_READONLY_CMDS } from "./constants";
import { PlanError } from "./errors";

export type PayableRoot = "swap" | "vault" | "poly" | "approve";

/**
 * Parse `plan add <cmd…>` tokens (without the leading `plan add`).
 * Rejects read-only / unknown roots with PLAN_BAD_CMD.
 */
export function classifyPlanAddArgs(tokens: string[]): {
  root: PayableRoot;
  rest: string[];
} {
  if (!tokens.length) {
    throw new PlanError(
      "PLAN_BAD_CMD",
      "Usage: plan add <swap|vault|poly|approve …>"
    );
  }
  let root = tokens[0].toLowerCase();
  let rest = tokens.slice(1);
  // `plan add poly list` — poly list is read-only
  if (root === "pred") root = "poly";
  if (PLAN_READONLY_CMDS.has(root)) {
    throw new PlanError("PLAN_BAD_CMD", `\`${root}\` is not a payable intent.`);
  }
  if (root === "poly" || root === "vault") {
    const sub = (rest[0] || "").toLowerCase();
    const readonlySubs = new Set([
      "list",
      "show",
      "help",
      "positions",
      "orders",
      "-h",
      ""
    ]);
    if (readonlySubs.has(sub)) {
      throw new PlanError(
        "PLAN_BAD_CMD",
        `\`poly/vault ${sub || "(empty)"}\` is not a payable intent.`
      );
    }
  }
  if (!PLAN_PAYABLE_ROOTS.has(root)) {
    throw new PlanError("PLAN_BAD_CMD", `Unknown intent root "${root}".`);
  }
  if (root === "pred") {
    return { root: "poly", rest };
  }
  return { root: root as PayableRoot, rest };
}

export function isPayableRecordingCommand(cmd0: string): boolean {
  const c = cmd0.toLowerCase();
  return PLAN_PAYABLE_ROOTS.has(c) || c === "pred";
}
