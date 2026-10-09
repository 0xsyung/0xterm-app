/**
 * @file checklist.test.ts
 * @description PERPS checklist unlock (#190)
 */
import { describe, expect, it } from "vitest";
import {
  PERPS_COPY,
  checklistSteps,
  isChecklistComplete,
  maxFeeSubcopy
} from "./checklist";

describe("checklist unlock (#190)", () => {
  it("requires wallet + agent + builder", () => {
    expect(
      isChecklistComplete({
        walletConnected: true,
        agentApproved: true,
        builderApproved: false
      })
    ).toBe(false);
    expect(
      isChecklistComplete({
        walletConnected: true,
        agentApproved: true,
        builderApproved: true
      })
    ).toBe(true);
  });

  it("exposes step done flags", () => {
    const steps = checklistSteps({
      walletConnected: true,
      agentApproved: true,
      builderApproved: false
    });
    expect(steps).toEqual([
      { id: "agent", done: true },
      { id: "builder", done: false }
    ]);
  });

  it("locks Design copy", () => {
    expect(PERPS_COPY.walletOff).toMatch(/Connect wallet/);
    expect(PERPS_COPY.connectCta).toBe("CONNECT HYPERLIQUID");
    expect(maxFeeSubcopy("0.02%")).toBe("Max fee 0.02%");
    expect(PERPS_COPY.leverageConfirm(10)).toBe("Confirm leverage 10×?");
  });
});
