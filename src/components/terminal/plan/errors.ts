/**
 * @file errors.ts
 * @description PLAN_* error catalog + user copy (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type PlanErrorCode =
  | "PLAN_EXISTS"
  | "PLAN_NOT_FOUND"
  | "PLAN_EMPTY"
  | "PLAN_BAD_CMD"
  | "PLAN_NEED_WALLET"
  | "PLAN_WRONG_CHAIN"
  | "PLAN_DRIFT"
  | "PLAN_USER_REJECT"
  | "PLAN_STEP_REVERT"
  | "PLAN_STALE_DEX"
  | "PLAN_BAD_NAME";

export const PLAN_ERROR_COPY: Record<PlanErrorCode, string> = {
  PLAN_EXISTS: "Pick another name or `plan rm`.",
  PLAN_NOT_FOUND: "`plan ls`.",
  PLAN_EMPTY: "Nothing to run.",
  PLAN_BAD_CMD: "Not a payable intent.",
  PLAN_NEED_WALLET: "`connect` or `wallet unlock`.",
  PLAN_WRONG_CHAIN: "`network <id>` then retry. Do not auto-switch without asking.",
  PLAN_DRIFT: "Aborted. `plan show` for the failing step. Re-add or edit by rm+new.",
  PLAN_USER_REJECT: "Stopped. Later steps still pending.",
  PLAN_STEP_REVERT: "Stopped. No stack dump.",
  PLAN_STALE_DEX: "Abort. Recreate the step.",
  PLAN_BAD_NAME: "Name must match [a-z0-9._-]{1,32}."
};

export class PlanError extends Error {
  readonly code: PlanErrorCode;
  constructor(code: PlanErrorCode, detail?: string) {
    const base = PLAN_ERROR_COPY[code];
    super(detail ? `[!] ${code} — ${detail}` : `[!] ${code} — ${base}`);
    this.code = code;
    this.name = "PlanError";
  }
}

export function planErrorLine(code: PlanErrorCode, detail?: string): string {
  const base = PLAN_ERROR_COPY[code];
  return detail ? `[!] ${code} — ${detail}` : `[!] ${code} — ${base}`;
}

/** Strip viem / multi-line stacks to one line (#7). */
export function sanitizePlanErr(err: unknown): string {
  if (err instanceof PlanError) return err.message;
  const msg =
    (err as { shortMessage?: string })?.shortMessage ||
    (err as { message?: string })?.message ||
    String(err ?? "Unknown error");
  const first = String(msg).split("\n")[0];
  if (/user rejected|denied|cancelled|User rejected/i.test(first)) {
    return planErrorLine("PLAN_USER_REJECT");
  }
  const clean = first
    .replace(/\s*Details:.*$/i, "")
    .replace(/\s*Version:.*$/i, "")
    .replace(/\s*Request Arguments:.*$/i, "")
    .trim();
  if (clean.length > 160) return `${clean.slice(0, 157)}…`;
  return clean || "Step failed.";
}
