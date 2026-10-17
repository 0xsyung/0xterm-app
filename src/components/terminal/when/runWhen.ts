/**
 * @file runWhen.ts
 * @description when CLI — create / ls / rm / pause / resume / --onchain (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { LogEntry, ThemeConfig } from "../types";
import {
  WHEN_HELP_FOOTER,
  WHEN_HONESTY_LINES,
  WHEN_USAGE,
  WHEN_WARN_BANNER
} from "./constants";
import { WhenError, sanitizeWhenErr, whenErrorLine } from "./errors";
import { parseWhenArgs } from "./parse";
import { actionLabel, triggerLabel } from "./summary";
import {
  assertUnderLimit,
  findWhen,
  newWhenId,
  removeWhen,
  setPaused,
  upsertWhen
} from "./store";
import type { WhenRule } from "./types";

export type WhenRunCtx = {
  args: string[];
  generateId: () => string;
  theme: ThemeConfig;
  rules: WhenRule[];
  saveRules: (rules: WhenRule[]) => void;
  /** Optional: plan names known for create-time warning (fire still re-checks). */
  hasPlan?: (name: string) => boolean;
  onPin: (log: LogEntry) => void;
  /** Build WhenWidget React node — injected to keep this module testable without JSX. */
  renderWidget?: (payload: {
    rules: WhenRule[];
    warnBanner: string;
    log: LogEntry;
  }) => unknown;
};

function text(id: string, body: string, warn = false): LogEntry {
  return { id, type: "text", text: body, warn };
}

function fail(id: string, body: string): LogEntry {
  return text(id, body, true);
}

export async function runWhenCommand(ctx: WhenRunCtx): Promise<LogEntry> {
  try {
    // raw = tokens after `when`
    const raw = ctx.args.slice(1);
    const parsed = parseWhenArgs(raw);

    if (parsed.kind === "help" || parsed.kind === "onchain") {
      // onchain throws before here; help:
      return text(
        ctx.generateId(),
        `${WHEN_USAGE}\n\n${WHEN_HONESTY_LINES.map((l) => `· ${l}`).join("\n")}\n\n${WHEN_HELP_FOOTER}`
      );
    }

    if (parsed.kind === "ls") {
      if (ctx.rules.length === 0) {
        return text(
          ctx.generateId(),
          "No watchers. `when price ETH > 4000` to create.\n" +
            WHEN_HONESTY_LINES.map((l) => `· ${l}`).join("\n")
        );
      }
      const id = ctx.generateId();
      const log: LogEntry = {
        id,
        type: "when",
        title: "WHEN",
        payload: {
          rules: ctx.rules,
          warn: WHEN_WARN_BANNER
        }
      };
      if (ctx.renderWidget) {
        return {
          ...log,
          component: ctx.renderWidget({
            rules: ctx.rules,
            warnBanner: WHEN_WARN_BANNER,
            log
          }) as LogEntry["component"]
        };
      }
      const lines = ctx.rules.map((r) => {
        const st = r.paused ? "paused" : "live";
        return `${r.id}  ${triggerLabel(r)}  → ${actionLabel(r.action)}  [${st}]`;
      });
      return text(
        id,
        `[when]\n${lines.join("\n")}\n\n${WHEN_WARN_BANNER}`
      );
    }

    if (parsed.kind === "rm") {
      if (parsed.id !== "all" && !findWhen(ctx.rules, parsed.id)) {
        return fail(ctx.generateId(), `[!] WHEN_BAD_GRAMMAR — unknown id ${parsed.id}`);
      }
      const next = removeWhen(ctx.rules, parsed.id);
      ctx.saveRules(next);
      return text(
        ctx.generateId(),
        parsed.id === "all"
          ? `[when] removed all (${ctx.rules.length}). Definitions cleared; timers stop with this tab.`
          : `[when] removed ${parsed.id}.`
      );
    }

    if (parsed.kind === "pause") {
      const next = setPaused(ctx.rules, parsed.id, true);
      if (!next) {
        return fail(ctx.generateId(), `[!] WHEN_BAD_GRAMMAR — unknown id ${parsed.id}`);
      }
      ctx.saveRules(next);
      return text(ctx.generateId(), `[when] paused ${parsed.id}.`);
    }

    if (parsed.kind === "resume") {
      const next = setPaused(ctx.rules, parsed.id, false);
      if (!next) {
        return fail(ctx.generateId(), `[!] WHEN_BAD_GRAMMAR — unknown id ${parsed.id}`);
      }
      ctx.saveRules(next);
      return text(
        ctx.generateId(),
        `[when] resumed ${parsed.id}. Watching only while this tab is open.`
      );
    }

    // create
    assertUnderLimit(ctx.rules);
    const now = Date.now();
    const rule: WhenRule = {
      v: 1,
      id: newWhenId(now),
      createdAt: now,
      trigger: parsed.rule.trigger,
      action: parsed.rule.action,
      cooldownSec: parsed.rule.cooldownSec,
      paused: false
    };
    if (
      rule.action.kind === "plan-run" &&
      ctx.hasPlan &&
      !ctx.hasPlan(rule.action.name)
    ) {
      // Soft: still create; fire will WHEN_PLAN_MISSING — warn at create
      const next = upsertWhen(ctx.rules, rule);
      ctx.saveRules(next);
      const ack = createAck(rule);
      return text(
        ctx.generateId(),
        `${ack}\n[!] WHEN_PLAN_MISSING — plan "${rule.action.name}" not found yet. Rule stays live.`,
        true
      );
    }
    const next = upsertWhen(ctx.rules, rule);
    ctx.saveRules(next);
    const id = ctx.generateId();
    const log: LogEntry = {
      id,
      type: "when",
      title: `WHEN ${rule.id}`,
      payload: { rules: [rule], warn: WHEN_WARN_BANNER, created: rule }
    };
    const ack = createAck(rule);
    if (ctx.renderWidget) {
      return {
        ...log,
        text: ack,
        component: ctx.renderWidget({
          rules: [rule],
          warnBanner: WHEN_WARN_BANNER,
          log
        }) as LogEntry["component"]
      };
    }
    return text(id, ack);
  } catch (e) {
    if (e instanceof WhenError) {
      return fail(ctx.generateId(), e.message);
    }
    return fail(ctx.generateId(), sanitizeWhenErr(e));
  }
}

function createAck(rule: WhenRule): string {
  return [
    `[when ${rule.id}] ${triggerLabel(rule)} → ${actionLabel(rule.action)}`,
    ...WHEN_HONESTY_LINES.map((l) => `· ${l}`),
    `cooldown ${rule.cooldownSec}s · poll ~15s (min 5s) while tab visible`
  ].join("\n");
}

export { whenErrorLine, WHEN_WARN_BANNER, WHEN_HELP_FOOTER, WHEN_HONESTY_LINES };
