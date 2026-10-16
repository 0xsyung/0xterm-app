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

describe("PerpsPanel deposit floor (#224)", () => {
  it("gates handleDeposit + CTA on validateDepositAmount / HL_MIN_DEPOSIT_USDC", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "PerpsPanel.tsx"),
      "utf8"
    );
    expect(src).toMatch(/validateDepositAmount\(amountValue\)/);
    expect(src).toMatch(/validateDepositAmount\(transferAmount\)/);
    expect(src).toMatch(/HL_MIN_DEPOSIT_USDC/);
    expect(src).toMatch(/perps-deposit-min-hint/);
  });
});

describe("PerpsPanel zero-balance deposit gate (#999)", () => {
  it("unlocks tabs pre-checklist when spot USDC is zero, with a deposit hint", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "PerpsPanel.tsx"),
      "utf8"
    );
    // Transfer (deposit) tab must be reachable for fundless accounts.
    expect(src).toMatch(/\(unlocked \|\| depositNeeded\)/);
    expect(src).toMatch(/const depositNeeded = spotUsdc === "0";/);
    expect(src).toMatch(/perps-deposit-hint/);
  });
});
