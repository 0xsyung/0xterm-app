/**
 * @file engine.ts
 * @description Tab-open poll engine — visibility pauses; no intervals until start (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { WHEN_DEFAULT_POLL_SEC, WHEN_MIN_POLL_SEC } from "./constants";
import { shouldFire } from "./predicate";
import type { WhenRule, WhenRuntimeState, WhenTickResult } from "./types";

export type WhenFireEvent = {
  rule: WhenRule;
  price: number;
  priceLabel: string;
  at: number;
};

export type WhenEngineDeps = {
  /** Resolve current price for a rule's token/quote. Never throw to prompt. */
  fetchPrice: (rule: WhenRule) => Promise<WhenTickResult>;
  /** Called on fire — must NOT sendTransaction / signTypedData. */
  onFire: (ev: WhenFireEvent) => void | Promise<void>;
  /** Persist rule patches (lastTick / lastFireAt). */
  onRulesPatch: (next: WhenRule[]) => void;
  /** Optional clock / visibility for tests. */
  now?: () => number;
  getVisibility?: () => DocumentVisibilityState;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
  pollSec?: number;
};

/**
 * Pure runtime state label for UI.
 * dormant-tab is distinct from paused (Soft lock).
 */
export function runtimeStateFor(
  rule: WhenRule,
  opts: { tabHidden: boolean; justFiredId?: string | null }
): WhenRuntimeState {
  if (opts.tabHidden) return "dormant-tab";
  if (rule.paused) return "paused";
  if (opts.justFiredId && opts.justFiredId === rule.id) return "fired";
  return "live";
}

/**
 * Session poller. Constructing does NOT start intervals — call start().
 * Importing prefs must not start watching until a live session mounts.
 */
export class WhenEngine {
  private rules: WhenRule[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private tabHidden = false;
  private justFiredId: string | null = null;
  private justFiredTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly deps: Required<
    Pick<
      WhenEngineDeps,
      | "fetchPrice"
      | "onFire"
      | "onRulesPatch"
      | "now"
      | "getVisibility"
      | "setIntervalFn"
      | "clearIntervalFn"
      | "pollSec"
    >
  >;

  constructor(deps: WhenEngineDeps) {
    const poll = Math.max(
      WHEN_MIN_POLL_SEC,
      deps.pollSec ?? WHEN_DEFAULT_POLL_SEC
    );
    this.deps = {
      fetchPrice: deps.fetchPrice,
      onFire: deps.onFire,
      onRulesPatch: deps.onRulesPatch,
      now: deps.now ?? (() => Date.now()),
      getVisibility:
        deps.getVisibility ??
        (() =>
          typeof document !== "undefined" ? document.visibilityState : "visible"),
      // Wrap globals — bare setInterval/clearInterval lose `this` when invoked
      // via this.deps.* (... ) → Chrome TypeError: Illegal invocation (#244).
      setIntervalFn:
        deps.setIntervalFn ??
        (((handler, timeout, ...args) =>
          globalThis.setInterval(handler, timeout, ...args)) as typeof setInterval),
      clearIntervalFn:
        deps.clearIntervalFn ??
        (((id) => globalThis.clearInterval(id)) as typeof clearInterval),
      pollSec: poll
    };
  }

  /** Replace rule list (from prefs / CLI). Does not auto-start. */
  setRules(rules: WhenRule[]): void {
    this.rules = rules.map((r) => ({ ...r }));
  }

  getRules(): WhenRule[] {
    return this.rules.map((r) => ({ ...r }));
  }

  isRunning(): boolean {
    return this.timer != null;
  }

  isStarted(): boolean {
    return this.started;
  }

  isTabHidden(): boolean {
    return this.tabHidden;
  }

  getJustFiredId(): string | null {
    return this.justFiredId;
  }

  /** Begin live session — starts poll only if tab visible. */
  start(): void {
    this.started = true;
    this.syncVisibility();
    this.ensureTimer();
  }

  stop(): void {
    this.started = false;
    this.clearTimer();
    if (this.justFiredTimer) {
      clearTimeout(this.justFiredTimer);
      this.justFiredTimer = null;
    }
  }

  /** visibilitychange handler — Soft: hidden → pause polls, dormant-tab. */
  onVisibilityChange(): void {
    if (!this.started) return;
    this.syncVisibility();
    this.ensureTimer();
  }

  private syncVisibility(): void {
    this.tabHidden = this.deps.getVisibility() === "hidden";
  }

  private ensureTimer(): void {
    if (!this.started || this.tabHidden) {
      this.clearTimer();
      return;
    }
    if (this.timer != null) return;
    const ms = this.deps.pollSec * 1000;
    this.timer = this.deps.setIntervalFn(() => {
      void this.tickAll();
    }, ms);
  }

  private clearTimer(): void {
    if (this.timer != null) {
      this.deps.clearIntervalFn(this.timer);
      this.timer = null;
    }
  }

  /** One poll pass over non-paused rules. Price fail → no throw. */
  async tickAll(): Promise<void> {
    if (!this.started || this.tabHidden) return;
    let next = this.rules.map((r) => ({ ...r }));
    let dirty = false;
    for (let i = 0; i < next.length; i++) {
      const rule = next[i]!;
      if (rule.paused) continue;
      let tick: WhenTickResult;
      try {
        tick = await this.deps.fetchPrice(rule);
      } catch (e) {
        // Mapped — never bubble to prompt
        tick = {
          ok: false,
          code: "WHEN_PRICE_FAIL",
          detail: e instanceof Error ? e.message.split("\n")[0] : undefined
        };
      }
      if (!tick.ok) {
        // tick error: leave lastTick; no fire
        continue;
      }
      const at = this.deps.now();
      next[i] = {
        ...rule,
        lastTick: { at, price: tick.priceLabel }
      };
      dirty = true;
      const decision = shouldFire(next[i]!, tick.price, at);
      if (decision === "fire") {
        next[i] = { ...next[i]!, lastFireAt: at };
        this.markFired(rule.id);
        try {
          await this.deps.onFire({
            rule: next[i]!,
            price: tick.price,
            priceLabel: tick.priceLabel,
            at
          });
        } catch {
          // fire handler must not crash engine
        }
      }
      // cooldown / no → silent
    }
    this.rules = next;
    if (dirty) this.deps.onRulesPatch(next);
  }

  private markFired(id: string): void {
    this.justFiredId = id;
    if (this.justFiredTimer) {
      clearTimeout(this.justFiredTimer);
    }
    this.justFiredTimer = setTimeout(() => {
      this.justFiredId = null;
      this.justFiredTimer = null;
    }, 2500);
  }
}
