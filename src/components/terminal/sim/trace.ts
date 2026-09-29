/**
 * @file trace.ts
 * @description trace — pure debug_traceTransaction helper, injected client (#18 / #136)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { PublicClient } from "viem";
import {
  stepsFromStructLogs,
  buildTraceFromSteps,
  type DigTraceStep
} from "../dig/debug";

export type TraceFailCode = "sim.trace_no_trace" | "sim.trace_no_engine";

export type TraceOutcome =
  | { ok: true; steps: DigTraceStep[]; truncated: boolean }
  | { ok: false; code: TraceFailCode };

export type TraceTxOpts = {
  client: PublicClient;
  txHash: `0x${string}`;
};

/** Default geth struct-logger options — omit named `tracer` (#136). */
export const TRACE_STRUCT_LOG_OPTS = {
  disableMemory: true,
  disableStorage: true
} as const;

export function isTxHash(s: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(s);
}

/**
 * True when the RPC rejects / disables debug_traceTransaction
 * (method missing, not allowed, plan/tier, -32601 / -32600, etc.).
 */
export function isTraceEngineUnavailable(err: unknown): boolean {
  const parts: string[] = [];
  const pushCodes = (obj: Record<string, unknown>): boolean => {
    const code = obj.code;
    if (code === -32601 || code === -32600) return true;
    if (typeof code === "string" && /^-?3260[01]$/.test(code)) return true;
    return false;
  };
  const walk = (v: unknown, depth: number): boolean => {
    if (depth > 4 || v == null) return false;
    if (typeof v === "string") {
      parts.push(v);
      return false;
    }
    if (typeof v !== "object") {
      parts.push(String(v));
      return false;
    }
    const o = v as Record<string, unknown>;
    if (pushCodes(o)) return true;
    for (const k of ["message", "shortMessage", "details", "statusText"] as const) {
      if (typeof o[k] === "string") parts.push(o[k] as string);
    }
    if (walk(o.data, depth + 1)) return true;
    if (walk(o.cause, depth + 1)) return true;
    if (walk(o.error, depth + 1)) return true;
    return false;
  };
  if (walk(err, 0)) return true;
  const blob = parts.join(" ").toLowerCase();
  if (!blob) return true; // throw with no message → treat as no engine
  return (
    /-32601\b/.test(blob) ||
    /-32600\b/.test(blob) ||
    blob.includes("method not found") ||
    blob.includes("method not allowed") ||
    blob.includes("invalid method") ||
    blob.includes("not allowed") ||
    blob.includes("not available") ||
    blob.includes("free tier") ||
    blob.includes("free-tier") ||
    blob.includes("does not exist/method") ||
    blob.includes("does not exist") ||
    blob.includes("unsupported method") ||
    blob.includes("method disabled") ||
    (blob.includes("debug_tracetransaction") &&
      (blob.includes("unsupported") ||
        blob.includes("disabled") ||
        blob.includes("not support") ||
        blob.includes("unavailable"))) ||
    (blob.includes("upgrade") && (blob.includes("tier") || blob.includes("plan"))) ||
    (blob.includes("plan") &&
      (blob.includes("not") || blob.includes("upgrade") || blob.includes("available")))
  );
}

/** Render a default struct-logger opcode trace for a tx. Read-only. */
export async function traceTx(opts: TraceTxOpts): Promise<TraceOutcome> {
  const { client, txHash } = opts;
  try {
    const result = (await client.request({
      method: "debug_traceTransaction" as never,
      params: [txHash, { ...TRACE_STRUCT_LOG_OPTS }] as never
    })) as unknown;
    const structLogs =
      result && typeof result === "object" && Array.isArray((result as Record<string, unknown>).structLogs)
        ? ((result as Record<string, unknown>).structLogs as unknown[])
        : Array.isArray(result)
          ? result
          : null;
    if (!structLogs || structLogs.length === 0) {
      return { ok: false, code: "sim.trace_no_trace" };
    }
    const built = buildTraceFromSteps(stepsFromStructLogs(structLogs));
    if (built.steps.length === 0) {
      return { ok: false, code: "sim.trace_no_trace" };
    }
    return { ok: true, steps: built.steps, truncated: built.truncated };
  } catch (err: unknown) {
    if (isTraceEngineUnavailable(err)) {
      return { ok: false, code: "sim.trace_no_engine" };
    }
    // Non-engine throw still means we did not get usable structLogs from a
    // successful call — prefer no_engine guidance over vague no_trace (#136).
    return { ok: false, code: "sim.trace_no_engine" };
  }
}
