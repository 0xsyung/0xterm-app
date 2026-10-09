/**
 * @file fees.test.ts
 * @description Builder fee helpers (#190)
 */
import { describe, expect, it } from "vitest";
import {
  buildFeePreview,
  builderFeeBpToTenths,
  builderFeeTenthsToBp,
  clampBuilderFeeBp,
  formatFeePercent,
  isAllowedBuilderFeeChip,
  parseBuilderFeeBp
} from "./fees";

describe("builder fee helpers (#190)", () => {
  it("converts bp ↔ tenths of a bp", () => {
    expect(builderFeeBpToTenths(2)).toBe(20);
    expect(builderFeeBpToTenths(0.5)).toBe(5);
    expect(builderFeeTenthsToBp(20)).toBe(2);
  });

  it("formats human percent for approveBuilderFee", () => {
    expect(formatFeePercent(2)).toBe("0.02%");
    expect(formatFeePercent(0.5)).toBe("0.005%");
    expect(formatFeePercent(10)).toBe("0.1%");
    expect(formatFeePercent(0)).toBe("0%");
  });

  it("clamps to 0.5–10 bp", () => {
    expect(clampBuilderFeeBp(0)).toBe(0.5);
    expect(clampBuilderFeeBp(100)).toBe(10);
    expect(parseBuilderFeeBp("2")).toBe(2);
  });

  it("allows Design chips only", () => {
    expect(isAllowedBuilderFeeChip(2)).toBe(true);
    expect(isAllowedBuilderFeeChip(3)).toBe(false);
  });

  it("builds fee preview with HL base + builder", () => {
    const p = buildFeePreview(2);
    expect(p.builderLabel).toBe("0.02%");
    expect(p.totalBp).toBeGreaterThan(p.builderBp);
  });
});
