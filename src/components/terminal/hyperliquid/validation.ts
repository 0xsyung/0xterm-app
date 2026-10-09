/**
 * @file validation.ts
 * @description Tick/lot size validation + price/size string normalization (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

/** Strip trailing zeros that Hyperliquid rejects on `p` / `s` strings. */
export function stripTrailingZeros(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (!t.includes(".")) return t.replace(/^0+(?=\d)/, "") || "0";
  const [whole, frac = ""] = t.split(".");
  const cleanedFrac = frac.replace(/0+$/, "");
  const w = whole.replace(/^0+(?=\d)/, "") || "0";
  return cleanedFrac ? `${w}.${cleanedFrac}` : w;
}

export function parsePositiveNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * szDecimals from HL meta: size must be a multiple of 10^(-szDecimals).
 * Returns plain-English error or null when valid.
 */
export function validateLotSize(
  sizeRaw: string,
  szDecimals: number
): string | null {
  const n = parsePositiveNumber(sizeRaw);
  if (n == null) return "Enter a positive size.";
  if (!Number.isFinite(szDecimals) || szDecimals < 0) return null;
  const scale = 10 ** szDecimals;
  const scaled = n * scale;
  // Allow float noise within 1e-8 of an integer step
  if (Math.abs(scaled - Math.round(scaled)) > 1e-6) {
    const step = szDecimals === 0 ? "1" : `0.${"0".repeat(szDecimals - 1)}1`;
    return `Size must match lot size (step ${step}).`;
  }
  return null;
}

/**
 * Price tick: px must be a multiple of 10^(-decimals) where decimals is
 * typically derived from mark px sig figs; we accept an explicit tickSize.
 */
export function validateTickSize(
  priceRaw: string,
  tickSize: number
): string | null {
  const n = parsePositiveNumber(priceRaw);
  if (n == null) return "Enter a positive price.";
  if (!Number.isFinite(tickSize) || tickSize <= 0) return null;
  const steps = n / tickSize;
  if (Math.abs(steps - Math.round(steps)) > 1e-6) {
    return `Price must match tick size (${stripTrailingZeros(String(tickSize))}).`;
  }
  return null;
}

export function validateLeverage(lev: number): string | null {
  if (!Number.isFinite(lev) || lev < 1 || lev > 50 || !Number.isInteger(lev)) {
    return "Leverage must be an integer from 1 to 50.";
  }
  return null;
}

export type OrderType = "market" | "limit";
export type OrderSide = "long" | "short";

export function validateOrderForm(args: {
  size: string;
  szDecimals: number;
  orderType: OrderType;
  price: string;
  tickSize?: number;
  leverage: number;
}): string | null {
  const lotErr = validateLotSize(args.size, args.szDecimals);
  if (lotErr) return lotErr;
  const levErr = validateLeverage(args.leverage);
  if (levErr) return levErr;
  if (args.orderType === "limit") {
    const tick = args.tickSize ?? 0;
    const priceErr =
      tick > 0
        ? validateTickSize(args.price, tick)
        : parsePositiveNumber(args.price) == null
          ? "Enter a positive price."
          : null;
    if (priceErr) return priceErr;
  }
  return null;
}
