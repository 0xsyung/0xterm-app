/**
 * @file errors.ts
 * @description WHEN_* error catalog + user copy (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { WHEN_ONCHAIN_V2_COPY, WHEN_USAGE } from "./constants";

export type WhenErrorCode =
  | "WHEN_BAD_GRAMMAR"
  | "WHEN_BAD_ACTION"
  | "WHEN_ONCHAIN_V2"
  | "WHEN_PLAN_MISSING"
  | "WHEN_PRICE_FAIL"
  | "WHEN_COOLDOWN"
  | "WHEN_LIMIT";

export const WHEN_ERROR_COPY: Record<WhenErrorCode, string> = {
  WHEN_BAD_GRAMMAR: `Show usage.\n${WHEN_USAGE}`,
  WHEN_BAD_ACTION: "Put it in a `plan`, then `do plan run <name>`.",
  WHEN_ONCHAIN_V2: WHEN_ONCHAIN_V2_COPY,
  WHEN_PLAN_MISSING: "Plan not found. Rule stays live.",
  WHEN_PRICE_FAIL: "Price tick failed. No fire.",
  WHEN_COOLDOWN: "", // silent
  WHEN_LIMIT: "Max 16 rules. Pause or `when rm` one first."
};

export class WhenError extends Error {
  readonly code: WhenErrorCode;
  constructor(code: WhenErrorCode, detail?: string) {
    if (code === "WHEN_ONCHAIN_V2") {
      super(WHEN_ONCHAIN_V2_COPY);
    } else {
      const base = WHEN_ERROR_COPY[code];
      super(detail ? `[!] ${code} — ${detail}` : `[!] ${code} — ${base}`);
    }
    this.code = code;
    this.name = "WhenError";
  }
}

export function whenErrorLine(code: WhenErrorCode, detail?: string): string {
  if (code === "WHEN_ONCHAIN_V2") return WHEN_ONCHAIN_V2_COPY;
  if (code === "WHEN_COOLDOWN") return "";
  const base = WHEN_ERROR_COPY[code];
  return detail ? `[!] ${code} — ${detail}` : `[!] ${code} — ${base}`;
}

/** Strip viem / multi-line stacks to one line (#7). */
export function sanitizeWhenErr(err: unknown): string {
  if (err instanceof WhenError) return err.message;
  const msg =
    (err as { shortMessage?: string })?.shortMessage ||
    (err as { message?: string })?.message ||
    String(err ?? "Unknown error");
  const first = String(msg).split("\n")[0];
  const clean = first
    .replace(/\s*Details:.*$/i, "")
    .replace(/\s*Version:.*$/i, "")
    .replace(/\s*Request Arguments:.*$/i, "")
    .trim();
  if (clean.length > 160) return `${clean.slice(0, 157)}…`;
  return clean || "when failed.";
}
