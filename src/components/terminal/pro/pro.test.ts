/**
 * @file pro.test.ts
 * @description ProPass buy / status / B1 preflight helpers (Soft ACK #139)
 */
import { describe, expect, it, vi } from "vitest";
import {
  PRO_PASS_CONTRACT,
  PRO_PASS_MAX_PERIODS,
  proPassAbi
} from "../constants";
import {
  buildPurchasePlan,
  parsePeriods,
  purchaseCost
} from "./buy";
import {
  commandNeedsProPreflight,
  isProGateActive,
  requireProForExternalWrite,
  shouldBlockExternalWrite
} from "./preflight";
import { formatProStatusText, type ProStatus } from "./status";
import { PRO_REFUSE } from "./constants";

describe("PRO_PASS_CONTRACT (Soft ACK #139 wire)", () => {
  it("wires Sepolia proxy (not implementation)", () => {
    expect(PRO_PASS_CONTRACT[11155111]).toBe(
      "0x509473decdd7F9Aa84fbd884cB05D5Ebd35cFC6e"
    );
    expect(PRO_PASS_CONTRACT[11155111]?.toLowerCase()).not.toBe(
      "0x4fb39ce261692955dc0eff94cba79f6e552bf170"
    );
  });

  it("leaves mainnet / Base empty (no sneak before #112)", () => {
    expect(PRO_PASS_CONTRACT[1]).toBeUndefined();
    expect(PRO_PASS_CONTRACT[8453]).toBeUndefined();
  });

  it("exports MAX_PERIODS 24 and purchase/isPro ABI surface", () => {
    expect(PRO_PASS_MAX_PERIODS).toBe(24);
    const names = proPassAbi.map((x) => ("name" in x ? x.name : null));
    expect(names).toEqual(
      expect.arrayContaining([
        "purchase",
        "isPro",
        "expiresAt",
        "pricePerPeriod",
        "periodSeconds",
        "balanceOf",
        "tokenOfOwnerByIndex"
      ])
    );
  });
});

describe("parsePeriods / purchaseCost / buildPurchasePlan", () => {
  it("accepts 1–24 integers only", () => {
    expect(parsePeriods("1")).toBe(1);
    expect(parsePeriods("24")).toBe(24);
    expect(parsePeriods("0")).toBeNull();
    expect(parsePeriods("25")).toBeNull();
    expect(parsePeriods("1.5")).toBeNull();
    expect(parsePeriods("abc")).toBeNull();
    expect(parsePeriods(undefined)).toBeNull();
  });

  it("costs pricePerPeriod * periods", () => {
    expect(purchaseCost(10n ** 16n, 3)).toBe(3n * 10n ** 16n); // 0.01 eth * 3
  });

  it("builds always-new-mint purchase plan on Sepolia", () => {
    const plan = buildPurchasePlan({
      chainId: 11155111,
      periods: 2,
      pricePerPeriod: 10n ** 16n
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.functionName).toBe("purchase");
    expect(plan.args).toEqual([2n]);
    expect(plan.value).toBe(2n * 10n ** 16n);
    expect(plan.contract).toBe(PRO_PASS_CONTRACT[11155111]);
    expect(plan.note).toContain("NEW");
  });

  it("fails closed when ProPass not wired", () => {
    const plan = buildPurchasePlan({
      chainId: 1,
      periods: 1,
      pricePerPeriod: 1n
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.error).toBe(PRO_REFUSE.noContract);
  });
});

describe("B1 preflight", () => {
  it("gate active only where contract wired", () => {
    expect(isProGateActive(11155111)).toBe(true);
    expect(isProGateActive(1)).toBe(false);
  });

  it("shouldBlockExternalWrite only when gate active and not Pro", () => {
    expect(shouldBlockExternalWrite({ gateActive: true, isPro: false })).toBe(
      true
    );
    expect(shouldBlockExternalWrite({ gateActive: true, isPro: true })).toBe(
      false
    );
    expect(shouldBlockExternalWrite({ gateActive: false, isPro: false })).toBe(
      false
    );
  });

  it("commandNeedsProPreflight covers external DEX paths; vault reads free", () => {
    expect(commandNeedsProPreflight("swap")).toBe(true);
    expect(commandNeedsProPreflight("arb")).toBe(true);
    expect(commandNeedsProPreflight("addliq")).toBe(true);
    expect(commandNeedsProPreflight("createpool")).toBe(true);
    expect(commandNeedsProPreflight("vault", "deposit")).toBe(true);
    expect(commandNeedsProPreflight("vault", "approve")).toBe(true);
    expect(commandNeedsProPreflight("vault", "list")).toBe(false);
    expect(commandNeedsProPreflight("vault", "show")).toBe(false);
    expect(commandNeedsProPreflight("vault", "help")).toBe(false);
    expect(commandNeedsProPreflight("will")).toBe(false);
    expect(commandNeedsProPreflight("news")).toBe(false);
    expect(commandNeedsProPreflight("pro")).toBe(false);
  });

  it("requireProForExternalWrite allows when gate inactive", async () => {
    const client = { readContract: vi.fn() } as never;
    const r = await requireProForExternalWrite({
      client,
      chainId: 8453,
      account: "0x1111111111111111111111111111111111111111"
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.gated).toBe(false);
    expect((client as { readContract: ReturnType<typeof vi.fn> }).readContract).not.toHaveBeenCalled();
  });

  it("requireProForExternalWrite blocks non-Pro on Sepolia", async () => {
    const client = {
      readContract: vi.fn().mockResolvedValue(false)
    } as never;
    const r = await requireProForExternalWrite({
      client,
      chainId: 11155111,
      account: "0x1111111111111111111111111111111111111111"
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(PRO_REFUSE.notPro);
  });

  it("requireProForExternalWrite passes Pro on Sepolia", async () => {
    const client = {
      readContract: vi.fn().mockResolvedValue(true)
    } as never;
    const r = await requireProForExternalWrite({
      client,
      chainId: 11155111,
      account: "0x1111111111111111111111111111111111111111"
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.gated).toBe(true);
      expect(r.isPro).toBe(true);
    }
  });
});

describe("formatProStatusText", () => {
  it("lists active + expired count", () => {
    const s: Extract<ProStatus, { ok: true }> = {
      ok: true,
      chainId: 11155111,
      contract: PRO_PASS_CONTRACT[11155111]!,
      account: "0x1111111111111111111111111111111111111111",
      isPro: true,
      active: [
        { tokenId: 1n, expiresAt: 2000000000n, active: true }
      ],
      expiredCount: 2,
      pricePerPeriod: 10n ** 16n,
      periodSeconds: 2592000n,
      now: 1700000000n
    };
    const text = formatProStatusText(s);
    expect(text).toContain("ACTIVE");
    expect(text).toContain("active passes: 1");
    expect(text).toContain("expired (still owned): 2");
    expect(text).toContain("#1");
    expect(text).toContain("NEW token");
  });
});
