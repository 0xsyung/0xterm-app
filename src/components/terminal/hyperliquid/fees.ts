/**
 * @file fees.ts
 * @description Builder fee formatting and tenths-of-bp conversion (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

import {
  HL_DEFAULT_BUILDER_FEE_BP,
  HL_MAX_BUILDER_FEE_BP,
  HL_MIN_BUILDER_FEE_BP,
  type HlBuilderFeeBp
} from "./config";

/**
 * Hyperliquid order builder `f` is fee in **tenths of a basis point**.
 * 1 bp = 10 tenths → 2 bp → f = 20.
 */
export function builderFeeBpToTenths(bp: number): number {
  return Math.round(bp * 10);
}

export function builderFeeTenthsToBp(tenths: number): number {
  return tenths / 10;
}

/** Human percent string for approveBuilderFee maxFeeRate, e.g. "0.02%". */
export function formatFeePercent(bp: number): string {
  const pct = bp / 100; // 2 bp = 0.02%
  const s = pct.toFixed(4).replace(/\.?0+$/, "");
  return `${s}%`;
}

export function formatFeeBpLabel(bp: number): string {
  return Number.isInteger(bp) ? `${bp}` : String(bp);
}

export function clampBuilderFeeBp(raw: number): number {
  if (!Number.isFinite(raw)) return HL_DEFAULT_BUILDER_FEE_BP;
  return Math.min(HL_MAX_BUILDER_FEE_BP, Math.max(HL_MIN_BUILDER_FEE_BP, raw));
}

export function parseBuilderFeeBp(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return clampBuilderFeeBp(n);
}

export function isAllowedBuilderFeeChip(bp: number): bp is HlBuilderFeeBp {
  return (
    bp === 0.5 || bp === 1 || bp === 2 || bp === 5 || bp === 10
  );
}

/** Rough HL base taker fee display (~2.5 bp typical; not a live quote). */
export const HL_BASE_TAKER_FEE_BP_DISPLAY = 2.5;

export type FeePreview = {
  hlBaseBp: number;
  builderBp: number;
  totalBp: number;
  hlBaseLabel: string;
  builderLabel: string;
  totalLabel: string;
};

export function buildFeePreview(builderBp: number): FeePreview {
  const bp = clampBuilderFeeBp(builderBp);
  const hlBaseBp = HL_BASE_TAKER_FEE_BP_DISPLAY;
  const totalBp = hlBaseBp + bp;
  return {
    hlBaseBp,
    builderBp: bp,
    totalBp,
    hlBaseLabel: formatFeePercent(hlBaseBp),
    builderLabel: formatFeePercent(bp),
    totalLabel: formatFeePercent(totalBp)
  };
}
