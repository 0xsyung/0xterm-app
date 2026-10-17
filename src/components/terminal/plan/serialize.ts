/**
 * @file serialize.ts
 * @description Plan v1 parse / stringify; reject unknown v; strip secrets (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Plan, PlanStep } from "./types";
import { PLAN_NAME_RE } from "./constants";

const STEP_KINDS = new Set([
  "swap",
  "vault",
  "poly",
  "approve",
  "poly-wrap",
  "poly-unwrap"
]);

/** Keys that must never appear on a stored plan / step (secrets / executable blobs). */
const FORBIDDEN_KEYS = new Set([
  "signature",
  "sig",
  "eip712",
  "privateKey",
  "mnemonic",
  "passphrase",
  "clobSecret",
  "apiKey",
  "apiSecret",
  "passphraseClob",
  "transactionRequest",
  "rawData",
  "calldata"
]);

function stripForbidden(obj: unknown): unknown {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripForbidden);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    // Never persist raw executable data as source of truth
    if (k === "data" && typeof v === "string" && v.startsWith("0x")) continue;
    out[k] = stripForbidden(v);
  }
  return out;
}

function isStep(raw: unknown): raw is PlanStep {
  if (!raw || typeof raw !== "object") return false;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || !s.id) return false;
  if (typeof s.kind !== "string" || !STEP_KINDS.has(s.kind)) return false;
  if (
    s.status !== "pending" &&
    s.status !== "done" &&
    s.status !== "skipped"
  )
    return false;
  return true;
}

/**
 * Parse a Plan from unknown JSON. Rejects unknown `v`, bad names, secret keys.
 * Returns null when not a plan object (caller may skip).
 */
export function parsePlan(raw: unknown): Plan | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) {
    throw new Error(`PLAN_BAD_VERSION — unknown plan v=${String(o.v)}`);
  }
  if (typeof o.name !== "string" || !PLAN_NAME_RE.test(o.name)) {
    throw new Error("PLAN_BAD_NAME — invalid plan name");
  }
  if (!Array.isArray(o.steps)) {
    throw new Error("PLAN_BAD_STEPS — steps must be an array");
  }
  const steps: PlanStep[] = [];
  for (const step of o.steps) {
    const cleaned = stripForbidden(step);
    if (!isStep(cleaned)) {
      throw new Error("PLAN_BAD_STEP — unrecognized or incomplete step");
    }
    steps.push(cleaned);
  }
  const createdAt =
    typeof o.createdAt === "number" && Number.isFinite(o.createdAt)
      ? o.createdAt
      : Date.now();
  const updatedAt =
    typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)
      ? o.updatedAt
      : createdAt;
  return {
    v: 1,
    name: o.name,
    createdAt,
    updatedAt,
    steps
  };
}

export function parsePlans(raw: unknown): Plan[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new Error("PLAN_BAD_PLANS — preferences.plans must be an array");
  }
  return raw.map((p, i) => {
    try {
      const plan = parsePlan(p);
      if (!plan) throw new Error("null");
      return plan;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`PLAN_BAD_PLANS — index ${i}: ${msg}`);
    }
  });
}

/** Serialize for prefs / export — never includes forbidden keys. */
export function serializePlan(plan: Plan): Plan {
  return stripForbidden({
    v: 1 as const,
    name: plan.name,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    steps: plan.steps
  }) as Plan;
}

export function serializePlans(plans: Plan[]): Plan[] {
  return plans.map(serializePlan);
}

/** True when export JSON appears to leak wallet/CLOB secrets (test helper). */
export function exportBlobHasSecrets(data: unknown): boolean {
  const s = JSON.stringify(data ?? {});
  return /mnemonic|privateKey|passphrase|apiSecret|clobSecret|"signature"\s*:/i.test(
    s
  );
}
