/**
 * @file globals.safariViewport.test.ts
 * @description #314/#317 — html opaque Finance floor; body + viewport glass strip
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("globals.css Safari keyboard viewport (#314/#317)", () => {
  const css = readFileSync(resolve(__dirname, "globals.css"), "utf8");

  it("keeps opaque Finance #0b0d10 on html as no-white floor", () => {
    expect(css).toMatch(/html\s*\{[^}]*background-color:\s*#0b0d10/s);
  });

  it("uses min-height 100dvh so the painted area covers the visual viewport", () => {
    expect(css).toMatch(/html\s*,\s*body\s*\{[^}]*min-height:\s*100dvh/s);
  });

  it("ships Finance glass token rgba(11, 13, 16, ~0.62) for body / keyboard strip", () => {
    expect(css).toMatch(/rgba\(\s*11\s*,\s*13\s*,\s*16\s*,\s*0\.6[0-9]\s*\)/);
  });

  it("pairs glass with backdrop-filter blur(16px) saturate(140%) and -webkit-", () => {
    expect(css).toMatch(/-webkit-backdrop-filter:\s*blur\(16px\)\s+saturate\(140%\)/);
    expect(css).toMatch(/(?<!-webkit-)backdrop-filter:\s*blur\(16px\)\s+saturate\(140%\)/);
  });

  it("falls back to solid #0b0d10 when backdrop-filter is unsupported", () => {
    expect(css).toMatch(/\.finance-keyboard-glass\s*\{[^}]*background-color:\s*#0b0d10/s);
    expect(css).toMatch(/body\s*\{[^}]*background-color:\s*#0b0d10/s);
    expect(css).toMatch(/@supports\s*\(\(-webkit-backdrop-filter:/);
  });

  it("does not leave html,body as a single solid-only bandage", () => {
    expect(css).not.toMatch(
      /html\s*,\s*body\s*\{[^}]*background-color:\s*#0b0d10[^}]*\}/s
    );
  });
});
