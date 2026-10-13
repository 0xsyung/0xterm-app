// @vitest-environment node
/**
 * @file headerContentPad.test.ts
 * @description #202 narrow content pad from live header height
 */
import { describe, expect, it } from "vitest";
import {
  HEADER_CONTENT_GAP_PX,
  HEADER_PAD_NARROW_FLOOR_PX,
  computeNarrowContentPadPx
} from "./headerContentPad";

describe("computeNarrowContentPadPx (#202)", () => {
  it("uses 144 soft floor when header unmeasured", () => {
    expect(HEADER_PAD_NARROW_FLOOR_PX).toBe(144);
    expect(HEADER_CONTENT_GAP_PX).toBe(8);
    expect(computeNarrowContentPadPx(null)).toBe(144);
    expect(computeNarrowContentPadPx(undefined)).toBe(144);
    expect(computeNarrowContentPadPx(0)).toBe(144);
    expect(computeNarrowContentPadPx(-1)).toBe(144);
  });

  it("clears measured ~134px header with ≥8px gap (floor still wins at 142)", () => {
    // 134 + 8 = 142 < 144 → floor
    expect(computeNarrowContentPadPx(134)).toBe(144);
  });

  it("tracks live header when taller than floor − gap", () => {
    // 140 + 8 = 148 ≥ 144
    expect(computeNarrowContentPadPx(140)).toBe(148);
    expect(computeNarrowContentPadPx(160.2)).toBe(161 + 8);
  });
});
