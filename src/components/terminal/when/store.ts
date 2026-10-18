/**
 * @file store.ts
 * @description preferences.whens load/save helpers (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { WHEN_MAX_RULES } from "./constants";
import { WhenError } from "./errors";
import { parseWhens, serializeWhens } from "./serialize";
import type { WhenRule } from "./types";

export function loadWhensFromPrefs(
  prefs: Record<string, unknown> | null | undefined
): WhenRule[] {
  try {
    return parseWhens(prefs?.whens);
  } catch {
    return [];
  }
}

export function whensToPrefsValue(rules: WhenRule[]): WhenRule[] {
  return serializeWhens(rules);
}

export function findWhen(rules: WhenRule[], id: string): WhenRule | undefined {
  const k = id.trim().toLowerCase();
  return rules.find((r) => r.id === k);
}

export function newWhenId(now = Date.now()): string {
  return `w_${now.toString(36).slice(-4)}${Math.random().toString(36).slice(2, 4)}`;
}

export function assertUnderLimit(rules: WhenRule[]): void {
  if (rules.length >= WHEN_MAX_RULES) {
    throw new WhenError("WHEN_LIMIT");
  }
}

export function upsertWhen(rules: WhenRule[], rule: WhenRule): WhenRule[] {
  const idx = rules.findIndex((r) => r.id === rule.id);
  const next = [...rules];
  if (idx >= 0) next[idx] = rule;
  else next.push(rule);
  return next;
}

export function removeWhen(rules: WhenRule[], id: string): WhenRule[] {
  if (id === "all") return [];
  const k = id.trim().toLowerCase();
  return rules.filter((r) => r.id !== k);
}

export function setPaused(
  rules: WhenRule[],
  id: string,
  paused: boolean
): WhenRule[] | null {
  const rule = findWhen(rules, id);
  if (!rule) return null;
  return upsertWhen(rules, { ...rule, paused });
}
