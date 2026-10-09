/**
 * @file validation.test.ts
 * @description Tick/lot + trailing-zero helpers (#190)
 */
import { describe, expect, it } from "vitest";
import {
  stripTrailingZeros,
  validateLotSize,
  validateLeverage,
  validateOrderForm,
  validateTickSize
} from "./validation";

describe("order validation (#190)", () => {
  it("strips trailing zeros Hyperliquid rejects", () => {
    expect(stripTrailingZeros("97000.0")).toBe("97000");
    expect(stripTrailingZeros("1.2300")).toBe("1.23");
    expect(stripTrailingZeros("0.00100")).toBe("0.001");
  });

  it("validates lot size in plain English", () => {
    expect(validateLotSize("1.23", 2)).toBeNull();
    expect(validateLotSize("1.234", 2)).toMatch(/lot size/i);
    expect(validateLotSize("", 2)).toMatch(/positive/i);
  });

  it("validates tick size", () => {
    expect(validateTickSize("100", 1)).toBeNull();
    expect(validateTickSize("100.5", 1)).toMatch(/tick/i);
  });

  it("validates leverage 1–50 integer", () => {
    expect(validateLeverage(5)).toBeNull();
    expect(validateLeverage(0)).toMatch(/1 to 50/);
    expect(validateLeverage(5.5)).toMatch(/1 to 50/);
  });

  it("validateOrderForm gates limit price", () => {
    expect(
      validateOrderForm({
        size: "1",
        szDecimals: 0,
        orderType: "market",
        price: "",
        leverage: 5
      })
    ).toBeNull();
    expect(
      validateOrderForm({
        size: "1",
        szDecimals: 0,
        orderType: "limit",
        price: "",
        leverage: 5
      })
    ).toMatch(/price/i);
  });
});
