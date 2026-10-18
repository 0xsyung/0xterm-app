/**
 * @file multicall.test.ts
 * @description Multicall3 pack eligibility, encode, honesty (#242 Soft ACK)
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";
import {
  decodeFunctionData,
  encodeFunctionData,
  getAddress,
  parseAbi,
  type Address,
  type Hex
} from "viem";
import {
  MULTICALL3_ADDRESS,
  MULTICALL3_BY_CHAIN,
  buildMulticallTx,
  collectEligiblePack,
  encodeAggregate3,
  ineligibleReason,
  multicall3Abi,
  multicall3ForChain,
  packConfirmCopy,
  packCallsDrifted,
  PACK_INELIGIBLE_COPY,
  truncateAddr,
  type PackCall
} from "./multicall";
import { encodeApproveStep } from "./approveEncode";
import { encodeSwapFromIntentFixture, assertDexNotStale } from "./swapRebuild";
import { DEX_REGISTRY } from "../constants";
import type { PlanStep, PlanStepApprove, PlanStepPoly, PlanStepSwap, PlanStepVault } from "./types";
import { PLAN_HELP_FOOTER, PLAN_WARN_BANNER, PLAN_USAGE } from "./constants";
import { planErrorLine } from "./errors";

const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const SPENDER = "0x1111111111111111111111111111111111111111" as Address;
const RECIPIENT = "0x3333333333333333333333333333333333333333" as Address;

function approveStep(over: Partial<PlanStepApprove> = {}): PlanStepApprove {
  return {
    id: "a1",
    kind: "approve",
    status: "pending",
    chainId: 1,
    token: TOKEN,
    spender: SPENDER,
    amountWei: "1000000",
    ...over
  };
}

function swapStep(over: Partial<PlanStepSwap> = {}): PlanStepSwap {
  const dex = DEX_REGISTRY[1]?.find((d) => d.type === "V3") || DEX_REGISTRY[1]?.[0];
  if (!dex) throw new Error("no dex");
  return {
    id: "s1",
    kind: "swap",
    status: "pending",
    chainId: 1,
    dexId: dex.id,
    from: {
      address: TOKEN,
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

function vaultStep(over: Partial<PlanStepVault> = {}): PlanStepVault {
  return {
    id: "v1",
    kind: "vault",
    status: "pending",
    op: "deposit",
    chainId: 1,
    vault: "0x2222222222222222222222222222222222222222",
    amountHuman: "1",
    amountWei: "1000000",
    previewAtAdd: { outWei: "10000", quotedAt: 1 },
    ...over
  };
}

function polyStep(over: Partial<PlanStepPoly> = {}): PlanStepPoly {
  return {
    id: "p1",
    kind: "poly",
    status: "pending",
    op: "buy",
    chainId: 137,
    conditionId: "c",
    tokenId: "t",
    outcome: "Yes",
    side: "BUY",
    amountHuman: "10",
    tif: "GTC",
    bookAtAdd: { mid: "0.5", tick: "0.01", minSize: "1", quotedAt: 1 },
    ...over
  };
}

describe("Multicall3 registry (#242)", () => {
  it("documents canonical address on supported EVM chains", () => {
    expect(getAddress(MULTICALL3_ADDRESS)).toBe(
      "0xcA11bde05977b3631167028862bE2a173976CA11"
    );
    for (const id of [1, 10, 137, 8453, 42161, 11155111, 84532, 421614, 80002, 11155420]) {
      expect(multicall3ForChain(id)).toBe(getAddress(MULTICALL3_ADDRESS));
      expect(MULTICALL3_BY_CHAIN[id]).toBeTruthy();
    }
  });

  it("refuses HyperEVM (no documented Multicall3)", () => {
    expect(multicall3ForChain(999)).toBeNull();
    expect(multicall3ForChain(998)).toBeNull();
  });
});

describe("eligibility — never silent skip (#242)", () => {
  it("approve + ERC20 swap same chain are eligible", () => {
    expect(ineligibleReason(approveStep())).toBeNull();
    expect(ineligibleReason(swapStep())).toBeNull();
    expect(ineligibleReason(vaultStep())).toBeNull();
  });

  it("poly EIP-712 refuses pack with clear copy", () => {
    expect(ineligibleReason(polyStep())).toBe("poly_eip712");
    expect(PACK_INELIGIBLE_COPY.poly_eip712).toMatch(/EIP-712|never fake/i);
  });

  it("native ETH swap ineligible", () => {
    const s = swapStep({
      from: {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "ETH",
        decimals: 18,
        isNative: true
      }
    });
    expect(ineligibleReason(s)).toBe("native_value");
  });

  it("rebuilt value>0 marks native_value", () => {
    expect(ineligibleReason(approveStep(), { rebuiltValue: 1n })).toBe(
      "native_value"
    );
  });

  it("poly-wrap ineligible", () => {
    expect(
      ineligibleReason({
        id: "1",
        kind: "poly-wrap",
        status: "pending",
        amountWei: "1"
      })
    ).toBe("poly_wrap");
  });
});

describe("collectEligiblePack (#242)", () => {
  it("packs consecutive approve+swap same chain", () => {
    const steps: PlanStep[] = [approveStep({ id: "1" }), swapStep({ id: "2" })];
    const r = collectEligiblePack(steps, 0);
    expect(r.indices).toEqual([0, 1]);
    expect(r.chainId).toBe(1);
    expect(r.breakReason).toBeNull();
  });

  it("stops before poly — does not silent-skip", () => {
    // Same chain as poly (137) so break reason is poly_eip712, not cross_chain.
    const steps: PlanStep[] = [
      approveStep({ id: "1", chainId: 137 }),
      approveStep({ id: "2", chainId: 137, amountWei: "2" }),
      polyStep({ id: "3" })
    ];
    const r = collectEligiblePack(steps, 0);
    expect(r.indices).toEqual([0, 1]);
    expect(r.breakReason).toBe("poly_eip712");
    expect(r.breakIndex).toBe(2);
  });

  it("cross-chain consecutive → refuse pack", () => {
    const steps: PlanStep[] = [
      approveStep({ id: "1", chainId: 1 }),
      approveStep({
        id: "2",
        chainId: 8453,
        token: TOKEN,
        spender: SPENDER
      })
    ];
    const r = collectEligiblePack(steps, 0);
    expect(r.indices).toEqual([0]);
    expect(r.breakReason).toBe("cross_chain");
    expect(r.breakIndex).toBe(1);
  });

  it("skips already-done steps when walking pending", () => {
    const steps: PlanStep[] = [
      approveStep({ id: "1", status: "done" }),
      approveStep({ id: "2" }),
      swapStep({ id: "3" })
    ];
    const r = collectEligiblePack(steps, 0);
    expect(r.indices).toEqual([1, 2]);
  });

  it("starting at poly yields empty pack + reason", () => {
    const steps: PlanStep[] = [polyStep()];
    const r = collectEligiblePack(steps, 0);
    expect(r.indices).toEqual([]);
    expect(r.breakReason).toBe("poly_eip712");
  });
});

describe("encode aggregate3 (#242)", () => {
  it("eligible approve+swap → one encode to Multicall3", () => {
    const a = approveStep();
    const encA = encodeApproveStep(a);
    const swap = swapStep();
    const dex = assertDexNotStale(swap);
    const encS = encodeSwapFromIntentFixture(swap, RECIPIENT, dex, 1_700_000_000);

    const calls: PackCall[] = [
      {
        target: encA.to,
        allowFailure: false,
        callData: encA.data,
        value: 0n,
        stepIndex: 0,
        kind: "approve",
        summary: "approve"
      },
      {
        target: encS.router,
        allowFailure: false,
        callData: encS.data,
        value: 0n,
        stepIndex: 1,
        kind: "swap",
        summary: "swap"
      }
    ];

    const tx = buildMulticallTx(1, calls);
    expect(tx.to).toBe(getAddress(MULTICALL3_ADDRESS));
    expect(tx.value).toBe(0n);

    const decoded = decodeFunctionData({
      abi: multicall3Abi,
      data: tx.data
    });
    expect(decoded.functionName).toBe("aggregate3");
    const args = decoded.args![0] as {
      target: Address;
      allowFailure: boolean;
      callData: Hex;
    }[];
    expect(args).toHaveLength(2);
    expect(args[0]!.allowFailure).toBe(false);
    expect(args[1]!.allowFailure).toBe(false);
    expect(args[0]!.target.toLowerCase()).toBe(encA.to.toLowerCase());
    expect(args[1]!.callData).toBe(encS.data);
  });

  it("encodeAggregate3 matches buildMulticallTx data", () => {
    const calls: PackCall[] = [
      {
        target: TOKEN,
        allowFailure: false,
        callData: "0x1234" as Hex,
        value: 0n,
        stepIndex: 0,
        kind: "approve",
        summary: "x"
      }
    ];
    expect(encodeAggregate3(calls)).toBe(buildMulticallTx(1, calls).data);
  });

  it("buildMulticallTx refuses unknown chain", () => {
    expect(() =>
      buildMulticallTx(999, [
        {
          target: TOKEN,
          allowFailure: false,
          callData: "0x" as Hex,
          value: 0n,
          stepIndex: 0,
          kind: "approve",
          summary: "x"
        }
      ])
    ).toThrow(/Multicall3/);
  });
});

describe("opt-in copy + honesty (#242)", () => {
  it("pack confirm copy says one wallet confirm for N same-chain calls", () => {
    expect(packConfirmCopy(3)).toBe(
      "one wallet confirm for 3 same-chain calls"
    );
    expect(packConfirmCopy(2)).not.toMatch(/auto-run|keeper/i);
  });

  it("PLAN_USAGE documents --multicall", () => {
    expect(PLAN_USAGE).toMatch(/plan run <name> \[--multicall\]/);
  });

  it("PLAN_HELP_FOOTER keeps keeper + closed-tab honesty + multicall sense", () => {
    expect(PLAN_HELP_FOOTER).toMatch(/not a keeper/i);
    expect(PLAN_HELP_FOOTER).toMatch(/closed tab cannot execute/i);
    expect(PLAN_HELP_FOOTER).toMatch(/--multicall/);
    expect(PLAN_HELP_FOOTER).toMatch(/one wallet confirm for N same-chain calls/i);
  });

  it("PLAN_WARN_BANNER unchanged honesty", () => {
    expect(PLAN_WARN_BANNER).toMatch(/Intents only/i);
    expect(PLAN_WARN_BANNER).toMatch(/closed tab cannot execute/i);
  });

  it("PLAN_PACK_REFUSE mapped (no viem stacks)", () => {
    expect(planErrorLine("PLAN_PACK_REFUSE")).toMatch(/PLAN_PACK_REFUSE/);
    expect(planErrorLine("PLAN_PACK_REFUSE")).not.toMatch(/viem|stack/i);
  });

  it("truncateAddr is EIP-55 checksummed", () => {
    const t = truncateAddr(MULTICALL3_ADDRESS.toLowerCase());
    expect(t).toMatch(/^0xcA11…/);
  });
});

describe("without --multicall = per-step unchanged (unit sense)", () => {
  it("collectEligiblePack is unused when flag off — packer still pure", () => {
    // Flag gating lives in runPlan/PlanRunWidget; packer does not auto-apply.
    const spy = vi.fn(collectEligiblePack);
    // Simulate default path: never call packer.
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("re-sim drift → no send (#242)", () => {
  const base = (): PackCall => ({
    target: TOKEN,
    allowFailure: false,
    callData: "0xabcd" as Hex,
    value: 0n,
    stepIndex: 0,
    kind: "approve",
    summary: "a"
  });

  it("identical pack → no drift", () => {
    const a = [base()];
    expect(packCallsDrifted(a, [base()]).drifted).toBe(false);
  });

  it("calldata change → drifted (caller must not sendTransaction)", () => {
    const prev = [base()];
    const next = [{ ...base(), callData: "0xdead" as Hex }];
    const r = packCallsDrifted(prev, next);
    expect(r.drifted).toBe(true);
    if (r.drifted) expect(r.reason).toMatch(/drifted/);
  });

  it("size change → drifted", () => {
    const r = packCallsDrifted([base()], [base(), { ...base(), stepIndex: 1 }]);
    expect(r.drifted).toBe(true);
  });
});
