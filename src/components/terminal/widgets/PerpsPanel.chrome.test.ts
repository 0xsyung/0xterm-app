// @vitest-environment node
/**
 * @file PerpsPanel.chrome.test.ts
 * @description #202 max-md sticky de-stack class lock on Perps inner tabs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("PerpsPanel chrome (#202)", () => {
  it("Order/Positions/Orders strip is static on max-md (no second pin)", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "PerpsPanel.tsx"),
      "utf8"
    );
    expect(src).toMatch(
      /sticky top-0 z-\[1\] max-md:static max-md:z-auto/
    );
  });
});
