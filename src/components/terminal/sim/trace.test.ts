/**
 * @file trace.test.ts
 * @description trace debug_traceTransaction helper unit tests (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { traceTx, isTxHash } from "./trace";

const HASH = "0x" + "ab".repeat(32);

describe("traceTx", () => {
  it("returns steps from structLogs result", async () => {
    const client = {
      request: vi.fn(async () => ({
        structLogs: [{ pc: 0, op: "STOP", gas: "100", depth: 1, stack: [], memory: "" }],
      })),
    };
    const res = await traceTx({ client: client as never, txHash: HASH } as never);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.steps).toHaveLength(1);
      expect(res.steps[0]!.op).toBe("STOP");
      expect(res.truncated).toBe(false);
    }
  });

  it("accepts a top-level array result", async () => {
    const client = {
      request: vi.fn(async () => [
        { pc: 0, op: "PUSH1", gas: "10", depth: 1, stack: [], memory: "" },
      ]),
    };
    const res = await traceTx({ client: client as never, txHash: HASH } as never);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.steps[0]!.op).toBe("PUSH1");
  });

  it("maps empty result to trace_no_trace", async () => {
    const client = {
      request: vi.fn(async () => ({})),
    };
    const res = await traceTx({ client: client as never, txHash: HASH } as never);
    expect(res).toEqual({ ok: false, code: "sim.trace_no_trace" });
  });

  it("maps RPC rejection to trace_no_trace", async () => {
    const client = {
      request: vi.fn(async () => {
        throw new Error("no debug trace support");
      }),
    };
    const res = await traceTx({ client: client as never, txHash: HASH } as never);
    expect(res).toEqual({ ok: false, code: "sim.trace_no_trace" });
  });

  it("truncates over DIG_DEBUG_TRACE_CAP", async () => {
    const logs = Array.from({ length: 10050 }, (_, i) => ({
      pc: i,
      op: "JUMPDEST",
      gas: "1",
      depth: 1,
      stack: [],
      memory: "",
    }));
    const client = { request: vi.fn(async () => ({ structLogs: logs })) };
    const res = await traceTx({ client: client as never, txHash: HASH } as never);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.truncated).toBe(true);
      expect(res.steps).toHaveLength(10000);
    }
  });
});

describe("isTxHash", () => {
  it("accepts a valid 64-hex-char hash", () => {
    expect(isTxHash(HASH)).toBe(true);
  });

  it("rejects invalid hashes", () => {
    expect(isTxHash("0x1234")).toBe(false);
    expect(isTxHash("1234")).toBe(false);
    expect(isTxHash("0x" + "z".repeat(64))).toBe(false);
    expect(isTxHash("")).toBe(false);
  });
});
