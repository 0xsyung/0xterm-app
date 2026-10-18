/**
 * @file types.ts
 * @description WhenRule v1 — tab-open watcher definitions (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type WhenOp = ">" | "<" | ">=" | "<=";

export type WhenTrigger = {
  kind: "price";
  token: string;
  op: WhenOp;
  value: string;
  quote: "USD" | "native";
};

export type WhenAction =
  | { kind: "notify" }
  | { kind: "read"; cmd: "news" | "price"; args: string[] }
  | { kind: "plan-run"; name: string };

export type WhenRule = {
  v: 1;
  id: string;
  createdAt: number;
  trigger: WhenTrigger;
  action: WhenAction;
  cooldownSec: number;
  paused: boolean;
  lastFireAt?: number;
  lastTick?: { at: number; price: string };
};

/** Runtime UI state — not persisted. */
export type WhenRuntimeState = "live" | "paused" | "fired" | "dormant-tab";

export type WhenTickResult =
  | { ok: true; price: number; priceLabel: string }
  | { ok: false; code: "WHEN_PRICE_FAIL"; detail?: string };
