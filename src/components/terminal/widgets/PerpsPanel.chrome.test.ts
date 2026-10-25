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

describe("PerpsPanel CHAT gutter (#227)", () => {
  it("shell uses INVEST_PANEL_CHAT_GUTTER_CLASS", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "PerpsPanel.tsx"),
      "utf8"
    );
    expect(src).toMatch(/INVEST_PANEL_CHAT_GUTTER_CLASS/);
    expect(src).toMatch(
      /\$\{theme\.text\} \$\{INVEST_PANEL_CHAT_GUTTER_CLASS\}/
    );
  });
});


describe("PerpsPanel CONNECT iPhone (#260)", () => {
  const src = () =>
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "PerpsPanel.tsx"),
      "utf8"
    );

  it("signs user-typed-data before hard signature-chain switch (gesture)", () => {
    const text = src();
    expect(text).toMatch(/runHlUserSignedWithOptionalChainRetry/);
    // connectAgent must not hard-return on ensureSignatureChain before attempt
    const connect = text.slice(
      text.indexOf("const connectAgent = async"),
      text.indexOf("const approveBuilder = async")
    );
    expect(connect).toMatch(/runHlUserSignedWithOptionalChainRetry/);
    expect(connect).not.toMatch(
      /const chain = await ensureSignatureChain\(network\);\s*if \(!chain\.ok\)/
    );
  });

  it("sticky connect error/status next to CTA + busy timeout", () => {
    const text = src();
    expect(text).toMatch(/data-testid="perps-connect-error"/);
    expect(text).toMatch(/data-testid="perps-connect-status"/);
    expect(text).toMatch(/HL_CONNECT_BUSY_TIMEOUT_MS/);
    expect(text).toMatch(/HL_CONNECT_TIMEOUT_COPY/);
    expect(text).toMatch(/HL_CONNECT_WALLET_REQUIRED/);
  });
});


describe("PerpsPanel CONNECT sticky Soft-fail (#262)", () => {
  const src = () =>
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "PerpsPanel.tsx"),
      "utf8"
    );

  it("Soft-maps connect + builder sticky via formatHlConnectStickyError", () => {
    const text = src();
    expect(text).toMatch(/formatHlConnectStickyError/);
    const connect = text.slice(
      text.indexOf("const connectAgent = async"),
      text.indexOf("const approveBuilder = async")
    );
    expect(connect).toMatch(/formatHlConnectStickyError\(approved\.error\)/);
    expect(connect).not.toMatch(/setError\(approved\.error\)/);
    const builder = text.slice(
      text.indexOf("const approveBuilder = async"),
      text.indexOf("const submitOrder = async")
    );
    expect(builder).toMatch(/formatHlConnectStickyError\(result\.error\)/);
    // Soft ACK #260 chrome floor holds.
    expect(text).toMatch(/data-testid="perps-connect-error"/);
    expect(text).toMatch(/data-testid="perps-builder-error"/);
    expect(text).toMatch(/runHlUserSignedWithOptionalChainRetry/);
  });
});
