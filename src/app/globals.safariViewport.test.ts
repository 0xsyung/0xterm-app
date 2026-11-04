/**
 * @file globals.safariViewport.test.ts
 * @description #314 — html/body paint Finance bg + 100dvh (no white keyboard gap)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("globals.css Safari keyboard viewport (#314)", () => {
  const css = readFileSync(resolve(__dirname, "globals.css"), "utf8");

  it("paints Finance #0b0d10 on html,body", () => {
    expect(css).toMatch(/html\s*,\s*body\s*\{[^}]*background-color:\s*#0b0d10/s);
  });

  it("uses min-height 100dvh so the painted area covers the visual viewport", () => {
    expect(css).toMatch(/html\s*,\s*body\s*\{[^}]*min-height:\s*100dvh/s);
  });
});
