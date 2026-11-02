/**
 * @file buttonClasses.test.ts
 * @description Soft ACK #294 Soft Design Soft-lock Soft-guards for shared button tokens
 */
import { describe, expect, it } from "vitest";
import type { ThemeConfig } from "../types";
import {
  BTN_BLOCK,
  BTN_HUG,
  BTN_LG,
  BTN_MD,
  BTN_SM,
  btnChipClass,
  btnClass,
  btnPrimaryFillStyle
} from "./buttonClasses";

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

describe("Soft ACK #294 buttonClasses", () => {
  it("defaults to hug + start-align (Soft Design A/B)", () => {
    const cls = btnClass({ theme, variant: "primary" });
    expect(cls).toContain("btn-base");
    expect(cls).toContain(BTN_HUG);
    expect(cls).toContain("justify-start");
    expect(cls).toContain("w-auto");
    expect(cls).not.toContain(BTN_BLOCK);
    expect(cls).not.toContain("tracking-widest");
  });

  it("block only when Soft Design F / form-primary exception requested", () => {
    const cls = btnClass({ theme, variant: "primary", block: true, size: "lg" });
    expect(cls).toContain(BTN_BLOCK);
    expect(cls).toContain("w-full");
    expect(cls).toContain("justify-center");
    expect(cls).toContain(BTN_LG);
    expect(cls).not.toContain(BTN_HUG);
  });

  it("exposes size tokens Soft Design C", () => {
    expect(btnClass({ theme, size: "sm" })).toContain(BTN_SM);
    expect(btnClass({ theme, size: "md" })).toContain(BTN_MD);
    expect(btnClass({ theme, size: "lg" })).toContain(BTN_LG);
  });

  it("variants use theme tokens Soft Design D", () => {
    expect(btnClass({ theme, variant: "secondary" })).toContain("btn-secondary");
    expect(btnClass({ theme, variant: "secondary" })).toContain(theme.border);
    expect(btnClass({ theme, variant: "ghost" })).toContain("btn-ghost");
    expect(btnClass({ theme, variant: "warn" })).toContain("btn-warn");
    expect(btnClass({ theme, variant: "warn" })).toContain(theme.warn);
  });

  it("primary fill Soft-locks phosphor ink Soft Design D", () => {
    expect(btnPrimaryFillStyle(theme)).toEqual({
      background: theme.phosphor,
      color: "#000000"
    });
  });

  it("chips hug + start Soft Design Soft FAIL guard", () => {
    const idle = btnChipClass(theme, false);
    const active = btnChipClass(theme, true);
    expect(idle).toContain(BTN_HUG);
    expect(idle).toContain("justify-start");
    expect(idle).toContain("w-auto");
    expect(idle).not.toContain("btn-block");
    expect(idle).not.toMatch(/(?:^|\s)w-full(?:\s|$)/);
    expect(active).toContain("btn-primary");
  });
});
