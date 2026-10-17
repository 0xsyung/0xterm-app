/**
 * @file serialize.ts
 * @description WhenRule prefs JSON round-trip (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { WHEN_DEFAULT_COOLDOWN_SEC } from "./constants";
import type { WhenAction, WhenOp, WhenRule, WhenTrigger } from "./types";

const REAL_OPS = new Set<WhenOp>([">", "<", ">=", "<="]);

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseTrigger(raw: unknown): WhenTrigger | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (t.kind !== "price") return null;
  const op = asString(t.op);
  if (!REAL_OPS.has(op as WhenOp)) return null;
  const value = asString(t.value);
  if (!value) return null;
  const quoteRaw = asString(t.quote, "USD").toUpperCase();
  const quote: "USD" | "native" =
    quoteRaw === "NATIVE" || quoteRaw === "ETH" ? "native" : "USD";
  const token = asString(t.token);
  if (!token) return null;
  return { kind: "price", token, op: op as WhenOp, value, quote };
}

function parseAction(raw: unknown): WhenAction | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  if (a.kind === "notify") return { kind: "notify" };
  if (a.kind === "read") {
    const cmd = asString(a.cmd).toLowerCase();
    if (cmd !== "news" && cmd !== "price") return null;
    const args = Array.isArray(a.args)
      ? a.args.filter((x): x is string => typeof x === "string")
      : [];
    return { kind: "read", cmd: cmd as "news" | "price", args };
  }
  if (a.kind === "plan-run") {
    const name = asString(a.name).trim().toLowerCase();
    if (!name) return null;
    return { kind: "plan-run", name };
  }
  return null;
}

/** Parse one rule; returns null on soft fail (skip bad entries). */
export function parseWhenRule(raw: unknown): WhenRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) {
    throw new Error("WHEN_BAD_VERSION — only v:1 supported");
  }
  const id = asString(r.id);
  if (!id) return null;
  const trigger = parseTrigger(r.trigger);
  const action = parseAction(r.action);
  if (!trigger || !action) return null;
  const rule: WhenRule = {
    v: 1,
    id: id.toLowerCase(),
    createdAt: asNumber(r.createdAt, Date.now()),
    trigger,
    action,
    cooldownSec: Math.max(0, asNumber(r.cooldownSec, WHEN_DEFAULT_COOLDOWN_SEC)),
    paused: !!r.paused
  };
  if (typeof r.lastFireAt === "number" && Number.isFinite(r.lastFireAt)) {
    rule.lastFireAt = r.lastFireAt;
  }
  if (r.lastTick && typeof r.lastTick === "object") {
    const lt = r.lastTick as Record<string, unknown>;
    const at = asNumber(lt.at, 0);
    const price = asString(lt.price);
    if (at && price) rule.lastTick = { at, price };
  }
  // Strip secrets if somehow present
  return rule;
}

export function parseWhens(raw: unknown): WhenRule[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new Error("WHEN_BAD_WHENS — preferences.whens must be an array");
  }
  const out: WhenRule[] = [];
  for (const item of raw) {
    try {
      const r = parseWhenRule(item);
      if (r) out.push(r);
    } catch (e) {
      if (e instanceof Error && /WHEN_BAD_VERSION/.test(e.message)) throw e;
      // skip corrupt entry
    }
  }
  return out;
}

export function serializeWhenRule(rule: WhenRule): WhenRule {
  const out: WhenRule = {
    v: 1,
    id: rule.id,
    createdAt: rule.createdAt,
    trigger: { ...rule.trigger },
    action:
      rule.action.kind === "read"
        ? { kind: "read", cmd: rule.action.cmd, args: [...rule.action.args] }
        : rule.action.kind === "plan-run"
          ? { kind: "plan-run", name: rule.action.name }
          : { kind: "notify" },
    cooldownSec: rule.cooldownSec,
    paused: !!rule.paused
  };
  if (rule.lastFireAt != null) out.lastFireAt = rule.lastFireAt;
  if (rule.lastTick) out.lastTick = { ...rule.lastTick };
  return out;
}

export function serializeWhens(rules: WhenRule[]): WhenRule[] {
  return rules.map(serializeWhenRule);
}

