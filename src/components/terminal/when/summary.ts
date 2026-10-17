/**
 * @file summary.ts
 * @description Human labels for when rules / widget (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { WhenAction, WhenRule, WhenRuntimeState } from "./types";

export function triggerLabel(rule: WhenRule): string {
  const t = rule.trigger;
  const q = t.quote === "native" ? "ETH" : "USD";
  return `price ${t.token} ${t.op} ${t.value} ${q}`;
}

export function actionLabel(action: WhenAction): string {
  if (action.kind === "notify") return "notify";
  if (action.kind === "read") {
    return `${action.cmd}${action.args.length ? " " + action.args.join(" ") : ""}`;
  }
  return `plan run ${action.name}`;
}

export function formatTick(rule: WhenRule): string {
  if (!rule.lastTick) return "—";
  return rule.lastTick.price;
}

export function formatTickAt(rule: WhenRule): string {
  if (!rule.lastTick) return "—";
  try {
    return new Date(rule.lastTick.at).toLocaleTimeString(undefined, {
      hour12: false
    });
  } catch {
    return "—";
  }
}

export function stateLabel(state: WhenRuntimeState): string {
  return state;
}
