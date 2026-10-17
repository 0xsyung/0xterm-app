/**
 * @file drift.ts
 * @description Quote / gas / book drift guards for plan run (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { PlanStepPoly, PlanStepSwap, PlanStepVault } from "./types";

/** Swap: expectedOut below stored amountOutMin, or worse than slippagePct vs quoteAtAdd. */
export function swapQuoteDrift(
  step: PlanStepSwap,
  expectedOutWei: bigint
): { ok: true } | { ok: false; reason: string } {
  const min = BigInt(step.quoteAtAdd.amountOutMin || "0");
  const atAdd = BigInt(step.quoteAtAdd.expectedOutWei || "0");
  if (expectedOutWei < min) {
    return {
      ok: false,
      reason: `expectedOut ${expectedOutWei} < amountOutMin ${min}`
    };
  }
  if (atAdd > 0n) {
    const floor =
      (atAdd * BigInt(Math.round((100 - step.slippagePct) * 100))) / 10000n;
    if (expectedOutWei < floor) {
      return {
        ok: false,
        reason: `expectedOut worse than ${step.slippagePct}% vs quoteAtAdd`
      };
    }
  }
  return { ok: true };
}

/** Vault preview moved more than maxBps (default 50). */
export function vaultPreviewDrift(
  step: PlanStepVault,
  previewWei: bigint,
  maxBps = 50
): { ok: true } | { ok: false; reason: string } {
  const before = BigInt(step.previewAtAdd.outWei || "0");
  if (before <= 0n || previewWei <= 0n) {
    return { ok: false, reason: "preview unavailable" };
  }
  const diff = previewWei > before ? previewWei - before : before - previewWei;
  const bps = Number((diff * 10000n) / before);
  if (bps > maxBps) {
    return { ok: false, reason: `preview drift ${bps} bps > ${maxBps}` };
  }
  return { ok: true };
}

/** Poly midpoint through the limit (or >50 bps vs bookAtAdd.mid when no limit). */
export function polyBookDrift(
  step: PlanStepPoly,
  mid: number
): { ok: true } | { ok: false; reason: string } {
  const atAdd = Number(step.bookAtAdd.mid);
  if (step.limitPrice != null && step.limitPrice !== "") {
    const lim = Number(step.limitPrice);
    if (!Number.isFinite(lim)) return { ok: false, reason: "bad limit" };
    if (step.side === "BUY" && mid > lim) {
      return { ok: false, reason: `mid ${mid} > buy limit ${lim}` };
    }
    if (step.side === "SELL" && mid < lim) {
      return { ok: false, reason: `mid ${mid} < sell limit ${lim}` };
    }
  } else if (Number.isFinite(atAdd) && atAdd > 0) {
    const bps = Math.abs(mid - atAdd) / atAdd * 10000;
    if (bps > 50) {
      return { ok: false, reason: `mid drift ${bps.toFixed(0)} bps` };
    }
  }
  return { ok: true };
}

/** Gas estimate > 2× baseline (or > capWei when set). */
export function gasDrift(
  estimate: bigint,
  baseline: bigint,
  capWei?: bigint
): { ok: true } | { ok: false; reason: string } {
  if (capWei != null && estimate > capWei) {
    return { ok: false, reason: `gas ${estimate} > cap ${capWei}` };
  }
  if (baseline > 0n && estimate > baseline * 2n) {
    return { ok: false, reason: `gas ${estimate} > 2× baseline ${baseline}` };
  }
  return { ok: true };
}
