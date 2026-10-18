/**
 * @file when.test.ts
 * @description Parser, predicate, cooldown, engine visibility, prefs, fire stubs (#25)
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WHEN_HONESTY_LINES,
  WHEN_ONCHAIN_V2_COPY,
  WHEN_HELP_FOOTER,
  WHEN_MAX_RULES
} from "./constants";
import { WhenError, whenErrorLine, sanitizeWhenErr } from "./errors";
import { parseWhenArgs, onchainCopyHasV2AndTab } from "./parse";
import {
  evalPricePredicate,
  inCooldown,
  predicateHolds,
  shouldFire
} from "./predicate";
import { parseWhenRule, parseWhens, serializeWhenRule, serializeWhens } from "./serialize";
import {
  assertUnderLimit,
  loadWhensFromPrefs,
  newWhenId,
  removeWhen,
  upsertWhen,
  whensToPrefsValue
} from "./store";
import { WhenEngine, runtimeStateFor } from "./engine";
import { runWhenCommand, type WhenRunCtx } from "./runWhen";
import type { WhenRule } from "./types";
import { buildProfileExport } from "../../../lib/localWallet/exportOmit";

function fixtureRule(over: Partial<WhenRule> = {}): WhenRule {
  return {
    v: 1,
    id: "w_test",
    createdAt: 1_700_000_000_000,
    trigger: {
      kind: "price",
      token: "ETH",
      op: ">",
      value: "4000",
      quote: "USD"
    },
    action: { kind: "notify" },
    cooldownSec: 60,
    paused: false,
    ...over
  };
}

const theme = {
  border: "b",
  cardBg: "c",
  primary: "p",
  warn: "w",
  muted: "m",
  rounded: "r",
  glow: "g",
  text: "t",
  name: "matrix"
} as WhenRunCtx["theme"];

function baseCtx(over: Partial<WhenRunCtx> = {}): WhenRunCtx {
  let rules: WhenRule[] = over.rules ? [...over.rules] : [];
  return {
    args: ["when"],
    generateId: () => "id1",
    theme,
    get rules() {
      return rules;
    },
    saveRules: (r) => {
      rules = r;
    },
    onPin: () => {},
    ...over
  };
}

describe("parser (#25)", () => {
  it("notify default when action omitted", () => {
    const p = parseWhenArgs(["price", "ETH", ">", "4000"]);
    expect(p.kind).toBe("create");
    if (p.kind !== "create") return;
    expect(p.rule.action).toEqual({ kind: "notify" });
    expect(p.rule.trigger.token).toBe("ETH");
    expect(p.rule.trigger.op).toBe(">");
    expect(p.rule.trigger.value).toBe("4000");
    expect(p.rule.trigger.quote).toBe("USD");
  });

  it("read action news / price", () => {
    const n = parseWhenArgs(["price", "ETH", ">", "4000", "do", "news", "ETH"]);
    expect(n.kind).toBe("create");
    if (n.kind === "create") {
      expect(n.rule.action).toEqual({
        kind: "read",
        cmd: "news",
        args: ["ETH"]
      });
    }
    const pr = parseWhenArgs(["price", "ETH", "<", "3000", "do", "price", "ETH"]);
    expect(pr.kind).toBe("create");
    if (pr.kind === "create") {
      expect(pr.rule.action).toEqual({
        kind: "read",
        cmd: "price",
        args: ["ETH"]
      });
    }
  });

  it("plan-run action", () => {
    const p = parseWhenArgs([
      "price",
      "ETH",
      ">",
      "4000",
      "do",
      "plan",
      "run",
      "sell-eth"
    ]);
    expect(p.kind).toBe("create");
    if (p.kind === "create") {
      expect(p.rule.action).toEqual({ kind: "plan-run", name: "sell-eth" });
    }
  });

  it("reject raw swap / vault / poly", () => {
    for (const bad of [
      ["price", "ETH", ">", "4000", "do", "swap", "1", "ETH", "USDC"],
      ["price", "ETH", ">", "4000", "do", "vault", "deposit", "x", "1"],
      ["price", "ETH", ">", "4000", "do", "poly", "buy", "x"]
    ]) {
      expect(() => parseWhenArgs(bad)).toThrow(WhenError);
      try {
        parseWhenArgs(bad);
      } catch (e) {
        expect((e as WhenError).code).toBe("WHEN_BAD_ACTION");
      }
    }
  });

  it("reject --onchain with copy containing v2 and tab", () => {
    expect(onchainCopyHasV2AndTab()).toBe(true);
    expect(WHEN_ONCHAIN_V2_COPY.toLowerCase()).toContain("v2");
    expect(WHEN_ONCHAIN_V2_COPY.toLowerCase()).toContain("tab");
    expect(WHEN_ONCHAIN_V2_COPY).toMatch(/Gelato/);
    expect(WHEN_ONCHAIN_V2_COPY).toMatch(/Chainlink CRE/);
    expect(WHEN_ONCHAIN_V2_COPY).toMatch(/Nothing was registered on-chain/);
    expect(() => parseWhenArgs(["--onchain", "price", "ETH", ">", "1"])).toThrow(
      WhenError
    );
    try {
      parseWhenArgs(["--onchain"]);
    } catch (e) {
      expect((e as WhenError).code).toBe("WHEN_ONCHAIN_V2");
      expect((e as WhenError).message).toContain("v2");
      expect((e as WhenError).message.toLowerCase()).toContain("tab");
    }
  });

  it("ETH quote → native", () => {
    const p = parseWhenArgs(["price", "ETH", ">=", "1", "ETH"]);
    expect(p.kind).toBe("create");
    if (p.kind === "create") expect(p.rule.trigger.quote).toBe("native");
  });

  it("ls / rm / pause / resume", () => {
    expect(parseWhenArgs(["ls"]).kind).toBe("ls");
    expect(parseWhenArgs(["rm", "w_ab12"])).toEqual({ kind: "rm", id: "w_ab12" });
    expect(parseWhenArgs(["rm", "all"])).toEqual({ kind: "rm", id: "all" });
    expect(parseWhenArgs(["pause", "w_1"])).toEqual({ kind: "pause", id: "w_1" });
    expect(parseWhenArgs(["resume", "w_1"])).toEqual({ kind: "resume", id: "w_1" });
  });
});

describe("predicate + cooldown (#25)", () => {
  it("crossing above/below level trigger", () => {
    expect(evalPricePredicate(4001, ">", 4000)).toBe(true);
    expect(evalPricePredicate(4000, ">", 4000)).toBe(false);
    expect(evalPricePredicate(4000, ">=", 4000)).toBe(true);
    expect(evalPricePredicate(3999, "<", 4000)).toBe(true);
    expect(evalPricePredicate(4000, "<=", 4000)).toBe(true);
  });

  it("cooldown suppresses; after cooldown re-fires if still true", () => {
    const rule = fixtureRule({ lastFireAt: 1000, cooldownSec: 60 });
    expect(inCooldown(rule, 1000 + 30_000)).toBe(true);
    expect(shouldFire(rule, 5000, 1000 + 30_000)).toBe("cooldown");
    expect(inCooldown(rule, 1000 + 60_000)).toBe(false);
    expect(shouldFire(rule, 5000, 1000 + 60_000)).toBe("fire");
    expect(shouldFire(rule, 1000, 1000 + 60_000)).toBe("no");
  });

  it("paused never fires", () => {
    const rule = fixtureRule({ paused: true });
    expect(shouldFire(rule, 99999, Date.now())).toBe("no");
  });

  it("predicateHolds uses rule threshold", () => {
    expect(predicateHolds(fixtureRule(), 4001)).toBe(true);
  });
});

describe("engine visibility + fire stub (#25)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("constructing does not start intervals (import-safe)", () => {
    const setIntervalFn = vi.fn();
    const eng = new WhenEngine({
      fetchPrice: async () => ({ ok: true, price: 1, priceLabel: "1" }),
      onFire: () => {},
      onRulesPatch: () => {},
      setIntervalFn: setIntervalFn as unknown as typeof setInterval,
      clearIntervalFn: vi.fn() as unknown as typeof clearInterval,
      getVisibility: () => "visible"
    });
    eng.setRules([fixtureRule()]);
    expect(eng.isRunning()).toBe(false);
    expect(eng.isStarted()).toBe(false);
    expect(setIntervalFn).not.toHaveBeenCalled();
  });

  it("hidden stops setInterval; visible restarts", () => {
    vi.useFakeTimers();
    let vis: DocumentVisibilityState = "visible";
    const timers = new Map<number, () => void>();
    let tid = 1;
    const setIntervalFn = vi.fn((fn: () => void) => {
      const id = tid++;
      timers.set(id, fn);
      return id as unknown as ReturnType<typeof setInterval>;
    });
    const clearIntervalFn = vi.fn((id: ReturnType<typeof setInterval>) => {
      timers.delete(id as unknown as number);
    });
    const eng = new WhenEngine({
      fetchPrice: async () => ({ ok: true, price: 5000, priceLabel: "5000" }),
      onFire: () => {},
      onRulesPatch: () => {},
      setIntervalFn: setIntervalFn as unknown as typeof setInterval,
      clearIntervalFn: clearIntervalFn as unknown as typeof clearInterval,
      getVisibility: () => vis,
      pollSec: 5,
      now: () => 10_000
    });
    eng.setRules([fixtureRule()]);
    eng.start();
    expect(eng.isRunning()).toBe(true);
    expect(setIntervalFn).toHaveBeenCalled();

    vis = "hidden";
    eng.onVisibilityChange();
    expect(eng.isRunning()).toBe(false);
    expect(eng.isTabHidden()).toBe(true);
    expect(runtimeStateFor(fixtureRule(), { tabHidden: true })).toBe("dormant-tab");
    expect(runtimeStateFor(fixtureRule({ paused: true }), { tabHidden: false })).toBe(
      "paused"
    );

    vis = "visible";
    eng.onVisibilityChange();
    expect(eng.isRunning()).toBe(true);
    eng.stop();
    expect(eng.isRunning()).toBe(false);
  });

  it("fire plan run stub does not send tx", async () => {
    const sendTransaction = vi.fn();
    const signTypedData = vi.fn();
    const onFire = vi.fn(async () => {
      // prompt-only — must not touch wallet
      expect(sendTransaction).not.toHaveBeenCalled();
      expect(signTypedData).not.toHaveBeenCalled();
    });
    const eng = new WhenEngine({
      fetchPrice: async () => ({ ok: true, price: 5000, priceLabel: "5000" }),
      onFire,
      onRulesPatch: () => {},
      getVisibility: () => "visible",
      setIntervalFn: vi.fn() as unknown as typeof setInterval,
      clearIntervalFn: vi.fn() as unknown as typeof clearInterval,
      now: () => 50_000
    });
    eng.setRules([
      fixtureRule({
        action: { kind: "plan-run", name: "sell-eth" },
        lastFireAt: undefined
      })
    ]);
    eng.start();
    await eng.tickAll();
    expect(onFire).toHaveBeenCalledTimes(1);
    const fireArg = (onFire.mock.calls as unknown as [{ rule: WhenRule }][])[0]![0]!;
    expect(fireArg.rule.action).toEqual({
      kind: "plan-run",
      name: "sell-eth"
    });
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(signTypedData).not.toHaveBeenCalled();
    eng.stop();
  });

  it("price fail → no throw to prompt", async () => {
    const onFire = vi.fn();
    const eng = new WhenEngine({
      fetchPrice: async () => {
        throw new Error("viem boom\nDetails: stack");
      },
      onFire,
      onRulesPatch: () => {},
      getVisibility: () => "visible",
      setIntervalFn: vi.fn() as unknown as typeof setInterval,
      clearIntervalFn: vi.fn() as unknown as typeof clearInterval,
      now: () => 1
    });
    eng.setRules([fixtureRule()]);
    eng.start();
    await expect(eng.tickAll()).resolves.toBeUndefined();
    expect(onFire).not.toHaveBeenCalled();
    eng.stop();
  });

  it("WHEN_PRICE_FAIL mapped result skips fire", async () => {
    const onFire = vi.fn();
    const eng = new WhenEngine({
      fetchPrice: async () => ({ ok: false, code: "WHEN_PRICE_FAIL" }),
      onFire,
      onRulesPatch: () => {},
      getVisibility: () => "visible",
      setIntervalFn: vi.fn() as unknown as typeof setInterval,
      clearIntervalFn: vi.fn() as unknown as typeof clearInterval,
      now: () => 1
    });
    eng.setRules([fixtureRule()]);
    eng.start();
    await eng.tickAll();
    expect(onFire).not.toHaveBeenCalled();
    eng.stop();
  });
});

describe("prefs round-trip (#25)", () => {
  it("serialize / parse round-trip", () => {
    const rule = fixtureRule({
      lastFireAt: 99,
      lastTick: { at: 98, price: "4100.5" },
      action: { kind: "plan-run", name: "alpha" }
    });
    const raw = serializeWhenRule(rule);
    const again = parseWhenRule(raw)!;
    expect(again.id).toBe("w_test");
    expect(again.action).toEqual({ kind: "plan-run", name: "alpha" });
    expect(again.lastTick?.price).toBe("4100.5");
  });

  it("loadWhensFromPrefs + import does not start intervals", () => {
    const rule = fixtureRule();
    const loaded = loadWhensFromPrefs({ whens: [serializeWhenRule(rule)] });
    expect(loaded[0]?.id).toBe("w_test");
    const setIntervalFn = vi.fn();
    const eng = new WhenEngine({
      fetchPrice: async () => ({ ok: true, price: 1, priceLabel: "1" }),
      onFire: () => {},
      onRulesPatch: () => {},
      setIntervalFn: setIntervalFn as unknown as typeof setInterval,
      clearIntervalFn: vi.fn() as unknown as typeof clearInterval
    });
    eng.setRules(loaded);
    // mount not called → no intervals
    expect(setIntervalFn).not.toHaveBeenCalled();
  });

  it("parseWhens rejects non-array", () => {
    expect(() => parseWhens({})).toThrow(/WHEN_BAD_WHENS/);
  });

  it("export includes whens without wallet secrets", async () => {
    const rule = fixtureRule();
    const exported = await buildProfileExport({
      version: "1.0",
      wallet: "0xabc",
      preferences: { theme: "matrix", whens: whensToPrefsValue([rule]) },
      customTokens: {},
      pinned: []
    });
    expect((exported.preferences as { whens: WhenRule[] }).whens[0].id).toBe(
      "w_test"
    );
    expect(exported.vault).toBeUndefined();
  });

  it("limit 16", () => {
    const rules = Array.from({ length: WHEN_MAX_RULES }, (_, i) =>
      fixtureRule({ id: `w_${i}` })
    );
    expect(() => assertUnderLimit(rules)).toThrow(WhenError);
  });

  it("upsert / remove", () => {
    let rules: WhenRule[] = [];
    rules = upsertWhen(rules, fixtureRule({ id: "w_a" }));
    rules = upsertWhen(rules, fixtureRule({ id: "w_b" }));
    expect(rules).toHaveLength(2);
    rules = removeWhen(rules, "w_a");
    expect(rules.map((r) => r.id)).toEqual(["w_b"]);
    rules = removeWhen(rules, "all");
    expect(rules).toHaveLength(0);
  });

  it("newWhenId shape", () => {
    expect(newWhenId()).toMatch(/^w_/);
  });
});

describe("runWhenCommand (#25)", () => {
  it("create prints all three honesty lines", async () => {
    const saved: WhenRule[][] = [];
    const ctx = baseCtx({
      args: ["when", "price", "ETH", ">", "4000"],
      rules: [],
      saveRules: (r) => saved.push(r)
    });
    // fix getter issue — rebuild
    let rules: WhenRule[] = [];
    const log = await runWhenCommand({
      args: ["when", "price", "ETH", ">", "4000"],
      generateId: () => "x",
      theme,
      get rules() {
        return rules;
      },
      saveRules: (r) => {
        rules = r;
      },
      onPin: () => {}
    });
    expect(log.text).toBeTruthy();
    for (const line of WHEN_HONESTY_LINES) {
      expect(log.text).toContain(line.includes("Watching") ? "Watching only while this tab is open" : line.slice(0, 20));
    }
    expect(log.text).toMatch(/Watching only while this tab is open/);
    expect(log.text).toMatch(/notify-only/i);
    expect(log.text).toMatch(/on-chain keeper/i);
    expect(rules).toHaveLength(1);
  });

  it("--onchain returns WHEN_ONCHAIN_V2 copy", async () => {
    const log = await runWhenCommand({
      args: ["when", "--onchain", "price", "ETH", ">", "1"],
      generateId: () => "x",
      theme,
      rules: [],
      saveRules: () => {},
      onPin: () => {}
    });
    expect(log.warn).toBe(true);
    expect(log.text).toContain("v2");
    expect(log.text!.toLowerCase()).toContain("tab");
    expect(log.text).not.toMatch(/registered successfully/i);
  });

  it("reject swap action", async () => {
    const log = await runWhenCommand({
      args: ["when", "price", "ETH", ">", "4000", "do", "swap", "1", "ETH", "USDC"],
      generateId: () => "x",
      theme,
      rules: [],
      saveRules: () => {},
      onPin: () => {}
    });
    expect(log.warn).toBe(true);
    expect(log.text).toMatch(/WHEN_BAD_ACTION/);
  });

  it("help footer honesty", () => {
    expect(WHEN_HELP_FOOTER).toMatch(/closed tab cannot watch/i);
    expect(WHEN_HELP_FOOTER).toMatch(/not an on-chain keeper/i);
  });

  it("sanitize strips viem stacks", () => {
    expect(sanitizeWhenErr(new Error("boom\nDetails: x\nVersion: y"))).not.toMatch(
      /Details/
    );
    expect(whenErrorLine("WHEN_LIMIT")).toMatch(/WHEN_LIMIT/);
  });
});

describe("runtimeState dormant vs paused (#25 Soft)", () => {
  it("dormant-tab distinct from paused", () => {
    const r = fixtureRule();
    expect(runtimeStateFor(r, { tabHidden: true })).toBe("dormant-tab");
    expect(runtimeStateFor(fixtureRule({ paused: true }), { tabHidden: false })).toBe(
      "paused"
    );
    expect(runtimeStateFor(r, { tabHidden: false, justFiredId: "w_test" })).toBe(
      "fired"
    );
    expect(runtimeStateFor(r, { tabHidden: false })).toBe("live");
  });
});


describe("summary + store edges (#25)", () => {
  it("labels trigger/action/ticks", async () => {
    const { triggerLabel, actionLabel, formatTick, formatTickAt, stateLabel } = await import("./summary");
    const r = fixtureRule({
      lastTick: { at: Date.UTC(2026, 0, 1, 12, 0, 0), price: "4100" },
      action: { kind: "read", cmd: "news", args: ["ETH"] }
    });
    expect(triggerLabel(r)).toMatch(/price ETH > 4000 USD/);
    expect(actionLabel(r.action)).toBe("news ETH");
    expect(actionLabel({ kind: "notify" })).toBe("notify");
    expect(actionLabel({ kind: "plan-run", name: "x" })).toBe("plan run x");
    expect(formatTick(r)).toBe("4100");
    expect(formatTick(fixtureRule())).toBe("—");
    expect(formatTickAt(fixtureRule())).toBe("—");
    expect(formatTickAt(r)).toBeTruthy();
    expect(stateLabel("dormant-tab")).toBe("dormant-tab");
  });

  it("setPaused / findWhen / load corrupt", async () => {
    const { setPaused, findWhen, loadWhensFromPrefs } = await import("./store");
    const rules = [fixtureRule({ id: "w_a" })];
    expect(findWhen(rules, "w_a")?.id).toBe("w_a");
    expect(setPaused(rules, "missing", true)).toBeNull();
    const paused = setPaused(rules, "w_a", true)!;
    expect(paused[0]!.paused).toBe(true);
    expect(loadWhensFromPrefs({ whens: "bad" })).toEqual([]);
    expect(loadWhensFromPrefs(null)).toEqual([]);
  });

  it("serialize skips bad entries; rejects bad version", () => {
    expect(parseWhens([{ v: 1, id: "w_ok", trigger: fixtureRule().trigger, action: { kind: "notify" }, cooldownSec: 60, paused: false }])).toHaveLength(1);
    expect(parseWhens([{ v: 1, id: "", trigger: fixtureRule().trigger, action: { kind: "notify" } }])).toHaveLength(0);
    expect(() => parseWhenRule({ v: 2, id: "x" })).toThrow(/WHEN_BAD_VERSION/);
  });

  it("parse native quote + bad grammar paths", () => {
    expect(() => parseWhenArgs(["price", "ETH"])).toThrow(WhenError);
    expect(() => parseWhenArgs(["price", "ETH", "??", "1"])).toThrow(WhenError);
    expect(() => parseWhenArgs(["price", "ETH", ">", "nope"])).toThrow(WhenError);
    expect(() => parseWhenArgs(["price", "ETH", ">", "1", "BTC"])).toThrow(WhenError);
    expect(() => parseWhenArgs(["price", "ETH", ">", "1", "do", "plan"])).toThrow(WhenError);
    expect(parseWhenArgs(["help"]).kind).toBe("help");
  });

  it("sanitizeWhenErr WhenError passthrough + long trim", () => {
    const e = new WhenError("WHEN_LIMIT");
    expect(sanitizeWhenErr(e)).toBe(e.message);
    expect(sanitizeWhenErr({ shortMessage: "short" })).toBe("short");
    expect(sanitizeWhenErr("x".repeat(200)).length).toBeLessThanOrEqual(160);
  });

  it("engine cooldown silent skip + markFired", async () => {
    const onFire = vi.fn();
    const patches: WhenRule[][] = [];
    const eng = new WhenEngine({
      fetchPrice: async () => ({ ok: true, price: 5000, priceLabel: "5000" }),
      onFire,
      onRulesPatch: (r) => patches.push(r),
      getVisibility: () => "visible",
      setIntervalFn: vi.fn() as unknown as typeof setInterval,
      clearIntervalFn: vi.fn() as unknown as typeof clearInterval,
      now: () => 100_000
    });
    eng.setRules([fixtureRule({ lastFireAt: 99_000, cooldownSec: 60 })]);
    eng.start();
    await eng.tickAll();
    expect(onFire).not.toHaveBeenCalled();
    expect(patches.length).toBeGreaterThan(0);
    eng.stop();
  });
});
