/**
 * @file runPlan.ts
 * @description plan CLI — new/add/show/run/skip/abort/rm/ls/rec (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import React from "react";
import type { Address, Chain, PublicClient } from "viem";
import type { LogEntry, ThemeConfig } from "../types";
import {
  PLAN_HELP_FOOTER,
  PLAN_SUBCOMMANDS,
  PLAN_USAGE,
  PLAN_WARN_BANNER
} from "./constants";
import { planErrorLine, PlanError, sanitizePlanErr } from "./errors";
import { classifyPlanAddArgs } from "./intent";
import {
  assertPlanName,
  createEmptyPlan,
  findPlan,
  newStepId,
  removePlan,
  upsertPlan
} from "./store";
import type { Plan, PlanSession, PlanStep } from "./types";
import { stepChainLabel, stepSummary, lastSimLabel } from "./summary";
import PlanWidget from "../widgets/PlanWidget";
import PlanRunWidget from "../widgets/PlanRunWidget";

// re-export store helpers used by shell
export {
  assertPlanName,
  createEmptyPlan,
  findPlan,
  loadPlansFromPrefs,
  newStepId,
  plansToPrefsValue,
  removePlan,
  upsertPlan,
  DEFAULT_PLAN_SESSION
} from "./store";
export type { Plan, PlanSession, PlanStep } from "./types";

export type PlanRunCtx = {
  args: string[];
  generateId: () => string;
  theme: ThemeConfig;
  address: Address | undefined;
  isConnected: boolean;
  activeChainId: number | null;
  chainObj: Chain | null;
  client: PublicClient | null;
  plans: Plan[];
  session: PlanSession;
  onPin: (log: LogEntry) => void;
  /** Persist plans array into preferences.plans */
  savePlans: (plans: Plan[]) => void;
  /** Persist recording / run session */
  saveSession: (session: PlanSession) => void;
  /**
   * Build a PlanStep from a payable command (swap/vault/poly/approve).
   * Shell supplies this — uses live quote/preview paths. Returns null + error text.
   */
  buildIntentStep: (
    root: "swap" | "vault" | "poly" | "approve",
    tokens: string[]
  ) => Promise<{ step: PlanStep } | { error: string }>;
};

function fail(id: string, text: string): LogEntry {
  return { id, type: "text", warn: true, text };
}

function text(id: string, t: string): LogEntry {
  return { id, type: "text", text: t };
}

function showWidget(
  ctx: PlanRunCtx,
  plan: Plan,
  title?: string
): LogEntry {
  const id = ctx.generateId();
  const log: LogEntry = {
    id,
    type: "plan",
    title: title || `PLAN ${plan.name}`,
    payload: { plan, warn: PLAN_WARN_BANNER }
  };
  return {
    ...log,
    component: React.createElement(PlanWidget, {
      theme: ctx.theme,
      plan,
      warnBanner: PLAN_WARN_BANNER,
      onPin: () => ctx.onPin(log),
      pinned: false
    })
  };
}

export async function runPlanCommand(ctx: PlanRunCtx): Promise<LogEntry | LogEntry[]> {
  const raw = ctx.args.slice(1);
  const sub = (raw[0] || "").toLowerCase();

  if (!sub || sub === "help" || sub === "-h") {
    return text(
      ctx.generateId(),
      `${PLAN_USAGE}\n\n${PLAN_HELP_FOOTER}`
    );
  }

  if (!(PLAN_SUBCOMMANDS as readonly string[]).includes(sub) && sub !== "help") {
    // allow unknown to fall through with usage
  }

  try {
    if (sub === "ls") {
      if (ctx.plans.length === 0) {
        return text(ctx.generateId(), "No saved plans. `plan new <name>` to start.");
      }
      const lines = ctx.plans.map((p) => {
        const pending = p.steps.filter((s) => s.status === "pending").length;
        const done = p.steps.filter((s) => s.status === "done").length;
        return `  ${p.name.padEnd(20)} ${p.steps.length} steps (${pending} pending, ${done} done)`;
      });
      const rec =
        ctx.session.recording && ctx.session.recordingName
          ? `\nRecording: ${ctx.session.recordingName}`
          : "";
      return text(
        ctx.generateId(),
        `[plans]\n${lines.join("\n")}${rec}`
      );
    }

    if (sub === "new") {
      const nameRaw = raw[1];
      if (!nameRaw) return fail(ctx.generateId(), "Usage: plan new <name>");
      const name = assertPlanName(nameRaw);
      if (findPlan(ctx.plans, name)) {
        return fail(ctx.generateId(), planErrorLine("PLAN_EXISTS"));
      }
      const plan = createEmptyPlan(name);
      const next = upsertPlan(ctx.plans, plan);
      ctx.savePlans(next);
      ctx.saveSession({
        ...ctx.session,
        recording: true,
        recordingName: name
      });
      return text(
        ctx.generateId(),
        `[✓] Plan "${name}" created. Recording on — payable cmds also plan-add. ${PLAN_WARN_BANNER}`
      );
    }

    if (sub === "rec") {
      const flag = (raw[1] || "").toLowerCase();
      if (flag !== "on" && flag !== "off") {
        return fail(ctx.generateId(), "Usage: plan rec on|off");
      }
      if (flag === "off") {
        ctx.saveSession({
          ...ctx.session,
          recording: false,
          recordingName: null
        });
        return text(ctx.generateId(), "Recording off.");
      }
      const name = ctx.session.recordingName;
      if (!name || !findPlan(ctx.plans, name)) {
        return fail(
          ctx.generateId(),
          "No active plan to record into. `plan new <name>` first."
        );
      }
      ctx.saveSession({ ...ctx.session, recording: true, recordingName: name });
      return text(ctx.generateId(), `Recording on → ${name}`);
    }

    if (sub === "rm") {
      const nameRaw = raw[1];
      if (!nameRaw) return fail(ctx.generateId(), "Usage: plan rm <name>");
      const name = assertPlanName(nameRaw);
      if (!findPlan(ctx.plans, name)) {
        return fail(ctx.generateId(), planErrorLine("PLAN_NOT_FOUND"));
      }
      ctx.savePlans(removePlan(ctx.plans, name));
      const sess = { ...ctx.session };
      if (sess.recordingName === name) {
        sess.recording = false;
        sess.recordingName = null;
      }
      if (sess.runningName === name) {
        sess.runningName = null;
        sess.runCursor = 0;
      }
      ctx.saveSession(sess);
      return text(ctx.generateId(), `[✓] Removed plan "${name}".`);
    }

    if (sub === "show") {
      const nameRaw = raw[1];
      let plan: Plan | undefined;
      if (nameRaw) {
        plan = findPlan(ctx.plans, assertPlanName(nameRaw));
      } else if (ctx.session.recordingName) {
        plan = findPlan(ctx.plans, ctx.session.recordingName);
      } else if (ctx.plans.length) {
        plan = ctx.plans[ctx.plans.length - 1];
      }
      if (!plan) {
        return fail(ctx.generateId(), planErrorLine("PLAN_NOT_FOUND"));
      }
      return showWidget(ctx, plan);
    }

    if (sub === "add") {
      const tokens = raw.slice(1);
      if (!tokens.length) {
        return fail(
          ctx.generateId(),
          "Usage: plan add <swap|vault|poly|approve …>"
        );
      }
      let root: "swap" | "vault" | "poly" | "approve";
      let rest: string[];
      try {
        ({ root, rest } = classifyPlanAddArgs(tokens));
      } catch (e) {
        return fail(ctx.generateId(), sanitizePlanErr(e));
      }
      const targetName =
        ctx.session.recordingName ||
        (ctx.plans.length ? ctx.plans[ctx.plans.length - 1]?.name : null);
      if (!targetName) {
        return fail(
          ctx.generateId(),
          "No plan to add to. `plan new <name>` first."
        );
      }
      const plan = findPlan(ctx.plans, targetName);
      if (!plan) {
        return fail(ctx.generateId(), planErrorLine("PLAN_NOT_FOUND"));
      }
      const built = await ctx.buildIntentStep(root, [root, ...rest]);
      if ("error" in built) {
        return fail(ctx.generateId(), built.error);
      }
      const step = { ...built.step, id: built.step.id || newStepId() };
      const updated: Plan = {
        ...plan,
        steps: [...plan.steps, step],
        updatedAt: Date.now()
      };
      ctx.savePlans(upsertPlan(ctx.plans, updated));
      const n = updated.steps.length;
      return [
        text(
          ctx.generateId(),
          `[plan ${plan.name} +step ${n}] ${stepSummary(step)}`
        ),
        showWidget(ctx, updated)
      ];
    }

    if (sub === "abort") {
      if (!ctx.session.runningName) {
        return text(ctx.generateId(), "No plan run in progress.");
      }
      const name = ctx.session.runningName;
      ctx.saveSession({
        ...ctx.session,
        runningName: null,
        runCursor: 0
      });
      return text(
        ctx.generateId(),
        `Aborted run of "${name}". Remaining steps stay pending.`
      );
    }

    if (sub === "skip") {
      if (!ctx.session.runningName) {
        return fail(ctx.generateId(), "No plan run in progress. `plan run <name>` first.");
      }
      const plan = findPlan(ctx.plans, ctx.session.runningName);
      if (!plan) {
        return fail(ctx.generateId(), planErrorLine("PLAN_NOT_FOUND"));
      }
      const idx = plan.steps.findIndex((s) => s.status === "pending");
      if (idx < 0) {
        return fail(ctx.generateId(), planErrorLine("PLAN_EMPTY"));
      }
      const steps = plan.steps.map((s, i) =>
        i === idx ? { ...s, status: "skipped" as const } : s
      );
      const updated = { ...plan, steps, updatedAt: Date.now() };
      ctx.savePlans(upsertPlan(ctx.plans, updated));
      return text(
        ctx.generateId(),
        `[plan ${plan.name}] skipped step ${idx + 1}. Continue with confirm or \`plan abort\`.`
      );
    }

    if (sub === "run") {
      const nameRaw = raw[1];
      if (!nameRaw) return fail(ctx.generateId(), "Usage: plan run <name>");
      const name = assertPlanName(nameRaw);
      const plan = findPlan(ctx.plans, name);
      if (!plan) {
        return fail(ctx.generateId(), planErrorLine("PLAN_NOT_FOUND"));
      }
      if (!ctx.isConnected || !ctx.address) {
        return fail(ctx.generateId(), planErrorLine("PLAN_NEED_WALLET"));
      }
      const pending = plan.steps.filter((s) => s.status === "pending");
      if (pending.length === 0) {
        return fail(ctx.generateId(), planErrorLine("PLAN_EMPTY"));
      }
      ctx.saveSession({
        ...ctx.session,
        runningName: name,
        runCursor: 0,
        recording: false
      });
      const id = ctx.generateId();
      const log: LogEntry = {
        id,
        type: "plan",
        title: `PLAN RUN ${name}`,
        payload: { plan, mode: "run" }
      };
      return {
        ...log,
        component: React.createElement(PlanRunWidget, {
          theme: ctx.theme,
          plan,
          userAddress: ctx.address,
          activeChainId: ctx.activeChainId,
          chainObj: ctx.chainObj,
          client: ctx.client,
          onPlansUpdate: (nextPlan: Plan) => {
            ctx.savePlans(upsertPlan(ctx.plans, nextPlan));
          },
          onSessionEnd: () => {
            ctx.saveSession({
              ...ctx.session,
              runningName: null,
              runCursor: 0
            });
          },
          onPin: () => ctx.onPin(log)
        })
      };
    }

    return fail(
      ctx.generateId(),
      `Unknown plan subcommand "${sub}".\n${PLAN_USAGE}`
    );
  } catch (e) {
    if (e instanceof PlanError) {
      return fail(ctx.generateId(), e.message);
    }
    return fail(ctx.generateId(), sanitizePlanErr(e));
  }
}

/** Append a step while recording (called from shell after live payable cmd builds intent). */
export function recordStepIfRecording(
  plans: Plan[],
  session: PlanSession,
  step: PlanStep,
  savePlans: (p: Plan[]) => void
): { plans: Plan[]; ack: string } | null {
  if (!session.recording || !session.recordingName) return null;
  const plan = findPlan(plans, session.recordingName);
  if (!plan) return null;
  const withId = { ...step, id: step.id || newStepId() };
  const updated: Plan = {
    ...plan,
    steps: [...plan.steps, withId],
    updatedAt: Date.now()
  };
  const next = upsertPlan(plans, updated);
  savePlans(next);
  return {
    plans: next,
    ack: `[plan ${plan.name} +step ${updated.steps.length}] ${stepSummary(withId)}`
  };
}

export { stepSummary, stepChainLabel, lastSimLabel, PLAN_WARN_BANNER, PLAN_HELP_FOOTER };
