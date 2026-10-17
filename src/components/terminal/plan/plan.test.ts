/**
 * @file plan.test.ts
 * @description Plan serialize, drift, rebuild, intent reject, export omit (#24)
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";
import type { Address } from "viem";
import { decodeFunctionData, encodeFunctionData, parseAbi } from "viem";
import { DEX_REGISTRY } from "../constants";
import { encodeV3ExactInputSingle } from "../swapEncode";
import {
  parsePlan,
  parsePlans,
  serializePlan,
  exportBlobHasSecrets
} from "./serialize";
import {
  createEmptyPlan,
  findPlan,
  upsertPlan,
  removePlan,
  newStepId,
  loadPlansFromPrefs
} from "./store";
import { swapQuoteDrift, vaultPreviewDrift, polyBookDrift, gasDrift } from "./drift";
import { classifyPlanAddArgs } from "./intent";
import { encodeSwapFromIntentFixture, assertDexNotStale } from "./swapRebuild";
import { encodeApproveStep } from "./approveEncode";
import { stepSummary, lastSimLabel, stepChainLabel } from "./summary";
import { PlanError, planErrorLine, sanitizePlanErr } from "./errors";
import type { Plan, PlanStepSwap } from "./types";
import { recordStepIfRecording } from "./runPlan";
import { buildProfileExport } from "../../../lib/localWallet/exportOmit";

const RECIPIENT = "0x3333333333333333333333333333333333333333" as Address;

function fixtureSwap(over: Partial<PlanStepSwap> = {}): PlanStepSwap {
  const dex = DEX_REGISTRY[1]?.find((d) => d.type === "V3") || DEX_REGISTRY[1]?.[0];
  if (!dex) throw new Error("no dex");
  return {
    id: "ps_1",
    kind: "swap",
    status: "pending",
    chainId: 1,
    dexId: dex.id,
    from: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      decimals: 6,
      isNative: false
    },
    to: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      symbol: "WETH",
      decimals: 18
    },
    amountInHuman: "100",
    amountInWei: "100000000",
    slippagePct: 0.5,
    feeTier: 3000,
    quoteAtAdd: {
      expectedOutWei: "50000000000000000",
      amountOutMin: "49750000000000000",
      quotedAt: 1_700_000_000
    },
    ...over
  };
}

describe("serialize Plan v1 (#24)", () => {
  it("round-trips a plan", () => {
    const plan = createEmptyPlan("alpha");
    plan.steps.push(fixtureSwap());
    const raw = serializePlan(plan);
    const again = parsePlan(raw);
    expect(again?.name).toBe("alpha");
    expect(again?.steps[0]?.kind).toBe("swap");
    expect((again?.steps[0] as PlanStepSwap).amountInHuman).toBe("100");
  });

  it("rejects unknown v", () => {
    expect(() => parsePlan({ v: 2, name: "x", steps: [] })).toThrow(/PLAN_BAD_VERSION/);
  });

  it("strips forbidden secret keys", () => {
    const dirty = {
      v: 1,
      name: "sec",
      createdAt: 1,
      updatedAt: 1,
      steps: [
        {
          ...fixtureSwap(),
          signature: "0xdead",
          privateKey: "0xabc",
          data: "0x1234"
        }
      ]
    };
    const p = parsePlan(dirty)!;
    const s = JSON.stringify(p);
    expect(s).not.toMatch(/signature|privateKey|"data":"0x/);
  });

  it("parsePlans rejects non-array", () => {
    expect(() => parsePlans({})).toThrow(/PLAN_BAD_PLANS/);
  });
});

describe("swap intent snapshot + rebuild (#24)", () => {
  it("stores swap intent shape", () => {
    const s = fixtureSwap();
    expect(s.chainId).toBe(1);
    expect(s.dexId).toBeTruthy();
    expect(s.quoteAtAdd.expectedOutWei).toBeTruthy();
    expect(stepSummary(s)).toMatch(/swap 100 USDC/);
  });

  it("rebuild fixture calldata matches live V3 encoder", () => {
    const step = fixtureSwap();
    const dex = assertDexNotStale(step);
    const { data } = encodeSwapFromIntentFixture(step, RECIPIENT, dex, 1_700_000_000);
    const expected = encodeV3ExactInputSingle(dex, {
      tokenIn: step.from.address as Address,
      tokenOut: step.to.address as Address,
      fee: 3000,
      recipient: RECIPIENT,
      deadline: BigInt(1_700_000_000 + 60 * 20),
      amountIn: BigInt(step.amountInWei),
      amountOutMinimum: BigInt(step.quoteAtAdd.amountOutMin),
      sqrtPriceLimitX96: 0n
    });
    expect(data).toBe(expected);
  });

  it("V2 tokens-for-tokens fixture encodes swapExactTokensForTokens", () => {
    const v2 = DEX_REGISTRY[1]?.find((d) => d.type === "V2");
    if (!v2) return; // skip if registry has no V2 on 1
    const step = fixtureSwap({ dexId: v2.id, feeTier: undefined });
    const { data } = encodeSwapFromIntentFixture(step, RECIPIENT, v2, 1_700_000_000);
    const decoded = decodeFunctionData({
      abi: parseAbi([
        "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)"
      ]),
      data
    });
    expect(decoded.functionName).toBe("swapExactTokensForTokens");
  });
});

describe("drift → PLAN_DRIFT (#24)", () => {
  it("expectedOut below min → drift", () => {
    const step = fixtureSwap();
    const r = swapQuoteDrift(step, 1n);
    expect(r.ok).toBe(false);
  });

  it("expectedOut ok passes", () => {
    const step = fixtureSwap();
    const r = swapQuoteDrift(step, BigInt(step.quoteAtAdd.expectedOutWei));
    expect(r.ok).toBe(true);
  });

  it("vault preview >50 bps drifts", () => {
    const r = vaultPreviewDrift(
      {
        id: "1",
        kind: "vault",
        status: "pending",
        op: "deposit",
        chainId: 1,
        vault: "0x1111111111111111111111111111111111111111",
        amountHuman: "1",
        amountWei: "1000000",
        previewAtAdd: { outWei: "10000", quotedAt: 1 }
      },
      9000n,
      50
    );
    expect(r.ok).toBe(false);
  });

  it("poly mid through buy limit drifts", () => {
    const r = polyBookDrift(
      {
        id: "1",
        kind: "poly",
        status: "pending",
        op: "buy",
        chainId: 137,
        conditionId: "c",
        tokenId: "t",
        outcome: "Yes",
        side: "BUY",
        amountHuman: "10",
        limitPrice: "0.4",
        tif: "GTC",
        bookAtAdd: { mid: "0.35", tick: "0.01", minSize: "1", quotedAt: 1 }
      },
      0.55
    );
    expect(r.ok).toBe(false);
  });

  it("gas >2× baseline drifts", () => {
    expect(gasDrift(300_000n, 100_000n).ok).toBe(false);
    expect(gasDrift(150_000n, 100_000n).ok).toBe(true);
  });
});

describe("plan add rejects read-only (#24)", () => {
  it("plan add price ETH rejected", () => {
    expect(() => classifyPlanAddArgs(["price", "ETH"])).toThrow(PlanError);
    try {
      classifyPlanAddArgs(["price", "ETH"]);
    } catch (e) {
      expect((e as PlanError).code).toBe("PLAN_BAD_CMD");
    }
  });

  it("poly list rejected", () => {
    expect(() => classifyPlanAddArgs(["poly", "list"])).toThrow(/payable/);
  });

  it("swap accepted", () => {
    const r = classifyPlanAddArgs(["swap", "0.1", "ETH", "USDC"]);
    expect(r.root).toBe("swap");
  });
});

describe("user reject leaves remaining pending (#24)", () => {
  it("record + mark one done leaves others pending", () => {
    let plans: Plan[] = [createEmptyPlan("runme")];
    const save = (p: Plan[]) => {
      plans = p;
    };
    const s1 = fixtureSwap({ id: "a" });
    const s2 = fixtureSwap({ id: "b", amountInHuman: "50" });
    recordStepIfRecording(
      plans,
      { recording: true, recordingName: "runme", runningName: null, runCursor: 0 },
      s1,
      save
    );
    recordStepIfRecording(
      plans,
      { recording: true, recordingName: "runme", runningName: null, runCursor: 0 },
      s2,
      save
    );
    const plan = findPlan(plans, "runme")!;
    expect(plan.steps).toHaveLength(2);
    // simulate user reject after step0 done
    const updated = {
      ...plan,
      steps: plan.steps.map((s, i) =>
        i === 0 ? { ...s, status: "done" as const, txHash: "0xabc" } : s
      )
    };
    plans = upsertPlan(plans, updated);
    const left = findPlan(plans, "runme")!;
    expect(left.steps[0]!.status).toBe("done");
    expect(left.steps[1]!.status).toBe("pending");
  });
});

describe("export includes plans, excludes wallet secrets (#24)", () => {
  it("preferences.plans round-trip in export blob without vault secrets", async () => {
    const plan = createEmptyPlan("exp");
    plan.steps.push(fixtureSwap());
    const base = {
      version: "1.0",
      wallet: "0x3333333333333333333333333333333333333333",
      preferences: { theme: "matrix", plans: [serializePlan(plan)] },
      customTokens: {},
      pinned: []
    };
    const exported = await buildProfileExport(base, { includeWallet: false });
    expect((exported.preferences as any).plans[0].name).toBe("exp");
    expect(exported.vault).toBeUndefined();
    expect(exportBlobHasSecrets(exported)).toBe(false);
    expect(JSON.stringify(exported)).not.toMatch(/privateKey|mnemonic|clobSecret/);
  });
});

describe("store helpers", () => {
  it("create / find / rm / load", () => {
    const p = createEmptyPlan("z.ed");
    expect(findPlan([p], "z.ed")?.name).toBe("z.ed");
    expect(removePlan([p], "z.ed")).toEqual([]);
    expect(loadPlansFromPrefs({ plans: [serializePlan(p)] })[0]?.name).toBe("z.ed");
    expect(newStepId().startsWith("ps_")).toBe(true);
  });

  it("PLAN_EXISTS sense via find", () => {
    const plans = [createEmptyPlan("dup")];
    expect(findPlan(plans, "dup")).toBeTruthy();
    expect(planErrorLine("PLAN_EXISTS")).toMatch(/plan rm/);
  });

  it("approve encode revoke is approve(spender, 0)", () => {
    const { data, to } = encodeApproveStep({
      id: "1",
      kind: "approve",
      status: "pending",
      chainId: 1,
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      spender: "0x1111111111111111111111111111111111111111",
      amountWei: "0"
    });
    expect(to.toLowerCase()).toBe("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    const decoded = decodeFunctionData({
      abi: parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]),
      data
    });
    expect(decoded.args?.[1]).toBe(0n);
  });

  it("assertDexNotStale throws PLAN_STALE_DEX", () => {
    expect(() =>
      assertDexNotStale(fixtureSwap({ dexId: "no-such-dex-ever" }))
    ).toThrow(/PLAN_STALE_DEX/);
  });
});

describe("summary + errors (#24)", () => {
  it("summarizes vault/poly/approve/wrap", () => {
    expect(
      stepSummary({
        id: "1",
        kind: "vault",
        status: "pending",
        op: "deposit",
        chainId: 1,
        vault: "0x1111111111111111111111111111111111111111",
        amountHuman: "10",
        amountWei: "10",
        previewAtAdd: { outWei: "1", quotedAt: 1 }
      })
    ).toMatch(/vault deposit/);
    expect(
      stepSummary({
        id: "1",
        kind: "poly",
        status: "pending",
        op: "buy",
        chainId: 137,
        conditionId: "c",
        tokenId: "t",
        outcome: "Yes",
        side: "BUY",
        amountHuman: "5",
        tif: "GTC",
        bookAtAdd: { mid: "0.5", tick: "0.01", minSize: "1", quotedAt: 1 }
      })
    ).toMatch(/poly buy/);
    expect(
      stepSummary({
        id: "1",
        kind: "approve",
        status: "pending",
        chainId: 1,
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        spender: "0x1111111111111111111111111111111111111111",
        amountWei: "0"
      })
    ).toMatch(/revoke/);
    expect(
      stepSummary({
        id: "1",
        kind: "poly-wrap",
        status: "pending",
        amountWei: "1000"
      })
    ).toMatch(/wrap/);
  });

  it("lastSimLabel + chain label", () => {
    expect(lastSimLabel({ id: "1", kind: "poly-wrap", status: "pending", amountWei: "1" })).toBe("unsimmed");
    expect(
      lastSimLabel({
        id: "1",
        kind: "poly-wrap",
        status: "pending",
        amountWei: "1",
        lastSim: { at: 1, ok: true }
      })
    ).toBe("ok");
    expect(
      lastSimLabel({
        id: "1",
        kind: "poly-wrap",
        status: "pending",
        amountWei: "1",
        lastSim: { at: 1, ok: false, reason: "quote drift" }
      })
    ).toBe("drift");
    expect(stepChainLabel({ id: "1", kind: "poly-wrap", status: "pending", amountWei: "1" })).toBe("137");
  });

  it("sanitizePlanErr maps reject + strips stacks", () => {
    expect(sanitizePlanErr(new Error("User rejected the request"))).toMatch(/PLAN_USER_REJECT/);
    expect(sanitizePlanErr({ message: "boom\nDetails: x\nVersion: viem" })).not.toMatch(/Details/);
  });
});
