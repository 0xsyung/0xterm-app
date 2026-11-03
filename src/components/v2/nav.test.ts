/**
 * @file nav.test.ts
 * @description V2 nav locks (#295)
 */
import { describe, expect, it } from "vitest";
import {
  V2_CHAIN_CHIPS,
  V2_DEFAULT_NAV,
  V2_MOVE_ACTIONS,
  V2_NAV_LABEL,
  V2_PNL_PERIODS,
  V2_PRIMARY_NAV,
  isV2PrimaryNav
} from "./nav";

describe("V2 nav", () => {
  it("includes Holdings PnL Move News Reports as primary", () => {
    expect([...V2_PRIMARY_NAV]).toEqual([
      "holdings",
      "pnl",
      "move",
      "news",
      "reports"
    ]);
    expect(V2_DEFAULT_NAV).toBe("holdings");
    for (const id of V2_PRIMARY_NAV) {
      expect(V2_NAV_LABEL[id]).toBeTruthy();
      expect(isV2PrimaryNav(id)).toBe(true);
    }
    expect(isV2PrimaryNav("settings")).toBe(false);
    expect(isV2PrimaryNav("social")).toBe(false);
    expect(isV2PrimaryNav("dev")).toBe(false);
  });

  it("Move hub is Send Receive Swap without Bridge", () => {
    expect(V2_MOVE_ACTIONS.map((a) => a.id)).toEqual([
      "send",
      "receive",
      "swap"
    ]);
    expect(V2_MOVE_ACTIONS.some((a) => a.id === ("bridge" as never))).toBe(
      false
    );
  });

  it("PnL periods use product labels", () => {
    expect([...V2_PNL_PERIODS]).toEqual(["24h", "7d", "30d", "All"]);
  });

  it("chain chips cover six mainnets + All", () => {
    expect(V2_CHAIN_CHIPS.map((c) => c.label)).toEqual([
      "All",
      "ETH",
      "ARB",
      "BASE",
      "POLYGON",
      "OP",
      "HYPE"
    ]);
  });
});
