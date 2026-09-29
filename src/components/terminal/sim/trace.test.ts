/**
 * @file trace.test.ts
 * @description trace debug_traceTransaction helper unit tests (#18 / #136)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import {
  traceTx,
  isTxHash,
  isTraceEngineUnavailable,
  TRACE_STRUCT_LOG_OPTS
} from "./trace";

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

  it("does not send tracer: structLogger — default struct-logger opts only", async () => {
    const request = vi.fn(async () => ({
      structLogs: [{ pc: 0, op: "STOP", gas: "1", depth: 1, stack: [], memory: "" }],
    }));
    await traceTx({ client: { request } as never, txHash: HASH } as never);
    expect(request).toHaveBeenCalledTimes(1);
    const arg = request.mock.calls[0]![0] as {
      method: string;
      params: [string, Record<string, unknown>];
    };
    expect(arg.method).toBe("debug_traceTransaction");
    expect(arg.params[0]).toBe(HASH);
    expect(arg.params[1]).toEqual({ ...TRACE_STRUCT_LOG_OPTS });
    expect(arg.params[1]).not.toHaveProperty("tracer");
  });

  it("maps empty / missing structLogs after success to sim.trace_no_trace", async () => {
    const emptyObj = await traceTx({
      client: { request: vi.fn(async () => ({})) } as never,
      txHash: HASH
    } as never);
    expect(emptyObj).toEqual({ ok: false, code: "sim.trace_no_trace" });

    const emptyArr = await traceTx({
      client: { request: vi.fn(async () => ({ structLogs: [] })) } as never,
      txHash: HASH
    } as never);
    expect(emptyArr).toEqual({ ok: false, code: "sim.trace_no_trace" });
  });

  it("maps method-not-found / -32601 to sim.trace_no_engine", async () => {
    const client = {
      request: vi.fn(async () => {
        throw Object.assign(new Error("Invalid method debug_traceTransaction"), {
          code: -32601
        });
      }),
    };
    const res = await traceTx({ client: client as never, txHash: HASH } as never);
    expect(res).toEqual({ ok: false, code: "sim.trace_no_engine" });
  });

  it("maps free-tier / -32600 style reject to sim.trace_no_engine", async () => {
    const client = {
      request: vi.fn(async () => {
        throw Object.assign(
          new Error("debug_traceTransaction is not available on the Free tier"),
          { code: -32600 }
        );
      }),
    };
    const res = await traceTx({ client: client as never, txHash: HASH } as never);
    expect(res).toEqual({ ok: false, code: "sim.trace_no_engine" });
  });

  it("maps generic RPC rejection to sim.trace_no_engine", async () => {
    const client = {
      request: vi.fn(async () => {
        throw new Error("no debug trace support");
      }),
    };
    const res = await traceTx({ client: client as never, txHash: HASH } as never);
    expect(res).toEqual({ ok: false, code: "sim.trace_no_engine" });
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

describe("isTraceEngineUnavailable", () => {
  it("detects -32601 / method not found", () => {
    expect(isTraceEngineUnavailable({ code: -32601, message: "Method not found" })).toBe(
      true
    );
    expect(
      isTraceEngineUnavailable(new Error("Invalid method debug_traceTransaction"))
    ).toBe(true);
  });

  it("detects free-tier / plan not available", () => {
    expect(
      isTraceEngineUnavailable({
        code: -32600,
        message: "not available on the Free tier — upgrade"
      })
    ).toBe(true);
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
