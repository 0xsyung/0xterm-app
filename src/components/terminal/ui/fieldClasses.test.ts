/**
 * @file fieldClasses.test.ts
 * @description #313 form field width tokens — default max-w-xs, address max-w-md
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
  it("default width is w-full max-w-xs with touch chrome", () => {
    const cls = fieldClass({ theme });
    expect(cls).toContain(FIELD_BASE);
    expect(cls).toContain(FIELD_WIDTH_DEFAULT);
    expect(cls).toContain("min-h-[44px]");
    expect(cls).toContain("text-base");
    expect(cls).toContain("max-w-xs");
    expect(cls).toContain(theme.border);
    expect(cls).not.toContain("max-w-md");
  });

  it("address width is w-full max-w-md", () => {
    const cls = fieldClass({ theme, width: "address" });
    expect(cls).toContain(FIELD_WIDTH_ADDRESS);
    expect(cls).toContain("max-w-md");
    expect(cls).not.toContain("max-w-xs");
  });

  it("label stack follows field width and stays start-aligned flex-col", () => {
    expect(fieldLabelClass()).toContain("max-w-xs");
    expect(fieldLabelClass("address")).toContain("max-w-md");
    expect(fieldLabelClass()).toContain("flex flex-col");
    expect(fieldLabelClass()).not.toContain("items-center");
  });
});
