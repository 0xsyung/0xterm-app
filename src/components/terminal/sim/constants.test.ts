/**
 * @file constants.test.ts
 * @description sim constants — inclusion footer + autocomplete + trace copy (#18 / #132 / #136)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it } from "vitest";
import { SIM_AUTOCOMPLETE_ARG1, SIM_ERROR } from "./constants";

describe("SIM_ERROR.not_inclusion", () => {
  it("matches #18 catalog footer wording", () => {
    expect(SIM_ERROR.not_inclusion).toBe(
      "Simulation is not inclusion. Confirm in wallet before sending."
    );
  });
});

describe("SIM_AUTOCOMPLETE_ARG1", () => {
  it("does not suggest unwired sim swap|tenderly|set verbs", () => {
    const lower = SIM_AUTOCOMPLETE_ARG1.map((c) => c.toLowerCase());
    expect(lower).not.toContain("swap");
    expect(lower).not.toContain("tenderly");
    expect(lower).not.toContain("set");
    expect(lower).toContain("help");
  });
});


describe("SIM_ERROR.trace_* (#136)", () => {
  it("trace_no_engine guides to alchemy/quicknode", () => {
    expect(SIM_ERROR.trace_no_engine).toContain("sim.trace_no_engine");
    expect(SIM_ERROR.trace_no_engine).toMatch(/rpc alchemy/i);
    expect(SIM_ERROR.trace_no_engine).toMatch(/rpc quicknode/i);
  });

  it("trace_no_trace is empty-structLogs only", () => {
    expect(SIM_ERROR.trace_no_trace).toBe(
      "[!] sim.trace_no_trace — debug_traceTransaction returned no usable structLogs."
    );
  });

  it("trace_usage mentions debug-capable RPC", () => {
    expect(SIM_ERROR.trace_usage).toMatch(/debug-capable RPC/i);
    expect(SIM_ERROR.trace_usage).toMatch(/Alchemy/);
    expect(SIM_ERROR.trace_usage).not.toMatch(/structLogger/);
  });
});
