/**
 * @file store.ts
 * @description preferences.plans load/save helpers (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Plan, PlanSession } from "./types";
import { parsePlans, serializePlans } from "./serialize";
import { PLAN_NAME_RE } from "./constants";
import { PlanError } from "./errors";

export const DEFAULT_PLAN_SESSION: PlanSession = {
  recording: false,
  recordingName: null,
  runningName: null,
  runCursor: 0
};

export function loadPlansFromPrefs(prefs: Record<string, unknown> | null | undefined): Plan[] {
  try {
    return parsePlans(prefs?.plans);
  } catch {
    return [];
  }
}

export function plansToPrefsValue(plans: Plan[]): Plan[] {
  return serializePlans(plans);
}

export function findPlan(plans: Plan[], name: string): Plan | undefined {
  return plans.find((p) => p.name === name);
}

export function assertPlanName(name: string): string {
  const n = name.trim().toLowerCase();
  if (!PLAN_NAME_RE.test(n)) throw new PlanError("PLAN_BAD_NAME");
  return n;
}

export function createEmptyPlan(name: string, now = Date.now()): Plan {
  const n = assertPlanName(name);
  return { v: 1, name: n, createdAt: now, updatedAt: now, steps: [] };
}

export function upsertPlan(plans: Plan[], plan: Plan): Plan[] {
  const idx = plans.findIndex((p) => p.name === plan.name);
  const next = [...plans];
  if (idx >= 0) next[idx] = { ...plan, updatedAt: Date.now() };
  else next.push(plan);
  return next;
}

export function removePlan(plans: Plan[], name: string): Plan[] {
  const n = name.trim().toLowerCase();
  return plans.filter((p) => p.name !== n);
}

export function newStepId(now = Date.now()): string {
  return `ps_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
