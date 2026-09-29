/**
 * @file trace.ts
 * @description trace — pure debug_traceTransaction helper, injected client (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { PublicClient } from "viem";
import {
  stepsFromStructLogs,
  buildTraceFromSteps,
  type DigTraceStep
} from "../dig/debug";

export type TraceOutcome =
  | { ok: true; steps: DigTraceStep[]; truncated: boolean }
  | { ok: false; code: "sim.trace_no_trace" };

export type TraceTxOpts = {
  client: PublicClient;
  txHash: `0x${string}`;
};

export function isTxHash(s: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(s);
}

/** Render a structLogger opcode trace for a tx. Read-only. */
export async function traceTx(opts: TraceTxOpts): Promise<TraceOutcome> {
  const { client, txHash } = opts;
  try {
    const result = (await client.request({
      method: "debug_traceTransaction" as never,
      params: [
        txHash,
        { tracer: "structLogger", disableStorage: false, disableMemory: false }
      ] as never
    })) as unknown;
    const structLogs =
      result && typeof result === "object" && Array.isArray((result as Record<string, unknown>).structLogs)
        ? ((result as Record<string, unknown>).structLogs as unknown[])
        : Array.isArray(result)
          ? result
          : null;
    if (!structLogs) return { ok: false, code: "sim.trace_no_trace" };
    const built = buildTraceFromSteps(stepsFromStructLogs(structLogs));
    return { ok: true, steps: built.steps, truncated: built.truncated };
  } catch {
    return { ok: false, code: "sim.trace_no_trace" };
  }
}
