/**
 * @file constants.test.ts
 * @description sim constants — inclusion footer + autocomplete honesty (#18 / #132)
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
