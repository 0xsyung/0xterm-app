/**
 * @file errors.test.ts
 * @description sim error copy resolver tests (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it } from "vitest";
import { simErrorText } from "./errors";

describe("simErrorText", () => {
  it("returns literal copy for string entries", () => {
    expect(simErrorText("no_chain")).toMatch(/select a network/i);
    expect(simErrorText("bad_to")).toMatch(/must be a 0x address/i);
  });

  it("returns formatted copy for function entries", () => {
    expect(simErrorText("revert", "NO_PROFIT")).toMatch(/eth_call reverted: NO_PROFIT/);
    expect(simErrorText("rpc", "timeout")).toMatch(/eth_call failed: timeout/);
  });

  it("handles empty param for function entries", () => {
    expect(simErrorText("revert")).toMatch(/eth_call reverted:/);
  });
});
