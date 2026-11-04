/**
 * @file fieldClasses.test.ts
 * @description #313 form field width tokens — px caps max-w-[320px] / max-w-[448px]
 */
import { describe, expect, it } from "vitest";
import type { ThemeConfig } from "../types";
import {
  FIELD_BASE,
  FIELD_WIDTH_ADDRESS,
  FIELD_WIDTH_DEFAULT,
  fieldClass,
  fieldLabelClass
} from "./fieldClasses";

const theme = {
  name: "test",
  bg: "bg-black",
  cardBg: "bg-black",
  text: "text-green-400",
  primary: "text-green-400",
  border: "border-green-800",
  glow: "",
  font: "font-mono",
  rounded: "rounded-none",
  promptSymbol: ">",
  hasScanlines: false,
  hasGrid: false,
  warn: "text-yellow-400",
  muted: "text-green-700",
  phosphor: "#00ff66",
  scanlineAlpha: "0.1",
  gridColor: "#003300"
} satisfies ThemeConfig;

describe("fieldClasses (#313)", () => {
  it("default width is w-full max-w-[320px] with touch chrome (px, not rem)", () => {
    const cls = fieldClass({ theme });
    expect(cls).toContain(FIELD_BASE);
    expect(cls).toContain(FIELD_WIDTH_DEFAULT);
    expect(cls).toContain("min-h-[44px]");
    expect(cls).toContain("text-base");
    expect(cls).toContain("max-w-[320px]");
    expect(cls).toContain(theme.border);
    expect(cls).not.toContain("max-w-xs");
    expect(cls).not.toContain("max-w-md");
    expect(cls).not.toContain("max-w-[448px]");
  });

  it("address width is w-full max-w-[448px] (px, not rem)", () => {
    const cls = fieldClass({ theme, width: "address" });
    expect(cls).toContain(FIELD_WIDTH_ADDRESS);
    expect(cls).toContain("max-w-[448px]");
    expect(cls).not.toContain("max-w-[320px]");
    expect(cls).not.toContain("max-w-xs");
    expect(cls).not.toContain("max-w-md");
  });

  it("label stack follows field px caps and stays start-aligned flex-col", () => {
    expect(fieldLabelClass()).toContain("max-w-[320px]");
    expect(fieldLabelClass("address")).toContain("max-w-[448px]");
    expect(fieldLabelClass()).toContain("flex flex-col");
    expect(fieldLabelClass()).not.toContain("items-center");
    expect(fieldLabelClass()).not.toContain("max-w-xs");
    expect(fieldLabelClass("address")).not.toContain("max-w-md");
  });

  it("exported width tokens encode Design 320 / 448 px ceilings", () => {
    expect(FIELD_WIDTH_DEFAULT).toBe("w-full max-w-[320px]");
    expect(FIELD_WIDTH_ADDRESS).toBe("w-full max-w-[448px]");
    const defPx = Number(
      FIELD_WIDTH_DEFAULT.match(/max-w-\[(\d+)px\]/)?.[1] ?? NaN
    );
    const addrPx = Number(
      FIELD_WIDTH_ADDRESS.match(/max-w-\[(\d+)px\]/)?.[1] ?? NaN
    );
    expect(defPx).toBeLessThanOrEqual(320);
    expect(addrPx).toBeLessThanOrEqual(448);
    expect(defPx).toBe(320);
    expect(addrPx).toBe(448);
  });
});
