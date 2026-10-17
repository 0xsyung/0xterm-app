/**
 * @file predicate.ts
 * @description Level-trigger eval + cooldown (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { WhenOp, WhenRule } from "./types";

/** Level trigger: true while predicate holds (not edge-crossing). */
export function evalPricePredicate(
  price: number,
  op: WhenOp,
  threshold: number
): boolean {
  if (!Number.isFinite(price) || !Number.isFinite(threshold)) return false;
  switch (op) {
    case ">":
      return price > threshold;
    case "<":
      return price < threshold;
    case ">=":
      return price >= threshold;
    case "<=":
      return price <= threshold;
    default:
      return false;
  }
}

export function ruleThreshold(rule: WhenRule): number {
  return Number(rule.trigger.value);
}

export function predicateHolds(rule: WhenRule, price: number): boolean {
  return evalPricePredicate(price, rule.trigger.op, ruleThreshold(rule));
}

/** True when still inside cooldown window after lastFireAt. */
export function inCooldown(rule: WhenRule, nowMs: number): boolean {
  if (rule.lastFireAt == null) return false;
  const cd = Math.max(0, rule.cooldownSec) * 1000;
  return nowMs - rule.lastFireAt < cd;
}

/**
 * Should this tick fire?
 * - predicate true
 * - not paused
 * - not in cooldown (WHEN_COOLDOWN = silent skip)
 */
export function shouldFire(
  rule: WhenRule,
  price: number,
  nowMs: number
): "fire" | "cooldown" | "no" {
  if (rule.paused) return "no";
  if (!predicateHolds(rule, price)) return "no";
  if (inCooldown(rule, nowMs)) return "cooldown";
  return "fire";
}
