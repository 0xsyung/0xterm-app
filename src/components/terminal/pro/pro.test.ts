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
  shouldBlockExternalWrite,
  proGateOrError
} from "./preflight";
import { fetchProStatus, formatProStatusText, type ProStatus } from "./status";
import { runProCommand } from "./runPro";
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


describe("fetchProStatus", () => {
  const account = "0x1111111111111111111111111111111111111111" as const;
  const now = 1_700_000_000n;

  function mockClient(map: Record<string, unknown>) {
    return {
      readContract: vi.fn(async (args: { functionName: string; args?: unknown[] }) => {
        const key = args.functionName;
        if (key === "tokenOfOwnerByIndex") {
          const idx = Number(args.args?.[1] ?? 0);
          return (map.tokens as bigint[])[idx];
        }
        if (key === "expiresAt") {
          const id = args.args?.[0] as bigint;
          return (map.expires as Record<string, bigint>)[String(id)];
        }
        return map[key];
      })
    };
  }

  it("fails closed when ProPass unwired", async () => {
    const r = await fetchProStatus(mockClient({}) as never, 1, account, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(PRO_REFUSE.noContract);
  });

  it("splits active vs expired owned tokens", async () => {
    const client = mockClient({
      balanceOf: 3n,
      isPro: true,
      pricePerPeriod: 10n ** 16n,
      periodSeconds: 2592000n,
      tokens: [1n, 2n, 3n],
      expires: {
        "1": now + 1000n,
        "2": now - 10n,
        "3": now + 5000n
      }
    });
    const r = await fetchProStatus(client as never, 11155111, account, now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isPro).toBe(true);
    expect(r.active.map((a) => a.tokenId)).toEqual([1n, 3n]);
    expect(r.expiredCount).toBe(1);
    expect(r.pricePerPeriod).toBe(10n ** 16n);
  });

  it("formatProStatusText empty wallet copy", () => {
    const text = formatProStatusText({
      ok: true,
      chainId: 11155111,
      contract: PRO_PASS_CONTRACT[11155111]!,
      account,
      isPro: false,
      active: [],
      expiredCount: 0,
      pricePerPeriod: 10n ** 16n + 123456n,
      periodSeconds: 2592000n,
      now
    });
    expect(text).toContain("inactive");
    expect(text).toContain("pro buy");
    expect(text).toContain("0.010000");
  });
});

describe("runProCommand", () => {
  const theme = {} as never;
  const sepolia = { id: 11155111, name: "Sepolia" } as never;
  const account = "0x1111111111111111111111111111111111111111" as const;

  function baseCtx(over: Partial<Parameters<typeof runProCommand>[0]> = {}) {
    return {
      args: ["pro"],
      generateId: () => "id1",
      theme,
      address: account,
      isConnected: true,
      activeChainId: 11155111,
      chainObj: sepolia,
      client: {
        readContract: vi.fn(async (args: { functionName: string; args?: unknown[] }) => {
          if (args.functionName === "balanceOf") return 0n;
          if (args.functionName === "isPro") return false;
          if (args.functionName === "pricePerPeriod") return 10n ** 16n;
          if (args.functionName === "periodSeconds") return 2592000n;
          return 0n;
        })
      } as never,
      writeContract: vi.fn(async () => "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca" as `0x${string}`),
      ...over
    };
  }

  it("prints usage on bare / help", async () => {
    const a = await runProCommand(baseCtx({ args: ["pro"] }));
    expect(a.warn).toBeUndefined();
    expect(String((a as { text?: string }).text)).toContain("pro buy");
    const b = await runProCommand(baseCtx({ args: ["pro", "help"] }));
    expect(String((b as { text?: string }).text)).toContain("NEW");
  });

  it("unknown subcommand warns", async () => {
    const r = await runProCommand(baseCtx({ args: ["pro", "nope"] }));
    expect(r.warn).toBe(true);
    expect((r as { text: string }).text).toBe(PRO_REFUSE.unknown);
  });

  it("status requires wallet + network", async () => {
    const nw = await runProCommand(
      baseCtx({ args: ["pro", "status"], isConnected: false, address: undefined })
    );
    expect(nw.warn).toBe(true);
    expect((nw as { text: string }).text).toBe(PRO_REFUSE.noWallet);
    const nn = await runProCommand(
      baseCtx({
        args: ["pro", "status"],
        activeChainId: null,
        chainObj: null,
        client: null
      })
    );
    expect((nn as { text: string }).text).toMatch(/network/i);
  });

  it("status on unwired chain fails closed", async () => {
    const r = await runProCommand(
      baseCtx({
        args: ["pro", "status"],
        activeChainId: 1,
        chainObj: { id: 1, name: "Ethereum" } as never
      })
    );
    expect((r as { text: string }).text).toBe(PRO_REFUSE.noContract);
  });

  it("status lists empty pass set", async () => {
    const r = await runProCommand(baseCtx({ args: ["pro", "status"] }));
    expect(r.warn).toBeUndefined();
    expect(String((r as { text?: string }).text)).toContain("inactive");
  });

  it("buy clamps periods and submits purchase", async () => {
    const bad = await runProCommand(baseCtx({ args: ["pro", "buy", "0"] }));
    expect((bad as { text: string }).text).toBe(PRO_REFUSE.badPeriods);
    const ctx = baseCtx({ args: ["pro", "buy", "2"] });
    const ok = await runProCommand(ctx);
    expect(ok.warn).toBeUndefined();
    expect(String((ok as { text?: string }).text)).toMatch(/ProPass purchase submitted/);
    expect(ctx.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "purchase",
        args: [2n],
        value: 2n * 10n ** 16n
      })
    );
  });

  it("buy surfaces write failures", async () => {
    const r = await runProCommand(
      baseCtx({
        args: ["pro", "buy", "1"],
        writeContract: vi.fn(async () => {
          throw new Error("user rejected");
        })
      })
    );
    expect(r.warn).toBe(true);
    expect((r as { text: string }).text).toMatch(/pro buy failed/);
  });
});

describe("proGateOrError", () => {
  it("returns null when gate inactive", async () => {
    expect(
      await proGateOrError({
        client: { readContract: vi.fn() },
        chainId: 8453,
        account: "0x1111111111111111111111111111111111111111"
      })
    ).toBeNull();
  });

  it("returns notPro copy when gated and false", async () => {
    const err = await proGateOrError({
      client: { readContract: vi.fn().mockResolvedValue(false) },
      chainId: 11155111,
      account: "0x1111111111111111111111111111111111111111"
    });
    expect(err).toBe(PRO_REFUSE.notPro);
  });
});
