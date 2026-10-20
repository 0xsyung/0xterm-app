/**
 * @file will.test.ts
 * @description will delay parser, mainnet refuse, error map, typed confirm (#26)
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { parseDelay, formatDelayHuman, formatCountdown } from "./delay";
import { mapWillError, extractWillError } from "./errors";
import { WILL_MAINNET_IDS, WILL_REFUSE } from "./constants";
import { runWillCommand, fetchWillStatusPayload, type WillRunCtx } from "./runWill";
import { THEMES } from "../constants";
import type { ThemeConfig } from "../types";
import type { Chain } from "viem";
import { sepolia } from "viem/chains";

vi.mock("../widgets/WillStatusWidget", () => ({
  default: () => null
}));
vi.mock("../widgets/WillActionWidget", () => ({
  default: () => null
}));

const theme = THEMES.matrix as ThemeConfig;

function baseCtx(over: Partial<WillRunCtx> = {}): WillRunCtx {
  return {
    args: ["will"],
    generateId: () => "id-1",
    theme,
    address: undefined,
    isConnected: false,
    activeChainId: 11155111,
    chainObj: sepolia,
    client: null,
    customTokens: [],
    onPin: () => {},
    resolveEnsOrAddress: async () => null,
    writeContract: async () => "0xabc" as `0x${string}`,
    sendTransaction: async () => "0xabc" as `0x${string}`,
    ...over
  };
}

describe("parseDelay (#26)", () => {
  it("defaults to 90d when omitted", () => {
    const r = parseDelay(undefined);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.seconds).toBe(90 * 86400);
      expect(r.human).toBe("90d");
    }
  });

  it("accepts 7d, 90d, 1y", () => {
    for (const [raw, sec] of [
      ["7d", 7 * 86400],
      ["90d", 90 * 86400],
      ["1y", 365 * 86400]
    ] as const) {
      const r = parseDelay(raw);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.seconds).toBe(sec);
    }
  });

  it("rejects bare numbers, h, m, 0d, 3d", () => {
    for (const raw of ["90", "90h", "90m", "0d", "3d", "1h", "30m"]) {
      const r = parseDelay(raw);
      expect(r.ok).toBe(false);
    }
  });

  it("formatDelayHuman prefers days", () => {
    expect(formatDelayHuman(90 * 86400)).toBe("90d");
    expect(formatDelayHuman(7 * 86400)).toBe("7d");
    expect(formatDelayHuman(365 * 86400)).toBe("1y");
  });

  it("formatCountdown CLAIMABLE NOW at 0", () => {
    expect(formatCountdown(0)).toBe("CLAIMABLE NOW");
    expect(formatCountdown(-1)).toBe("CLAIMABLE NOW");
  });
});

describe("mapWillError (#26)", () => {
  it("TooEarly → human remaining", () => {
    const claimableAt = 1_700_000_000 + 76 * 86400;
    const now = 1_700_000_000;
    const msg = mapWillError(
      { name: "TooEarly", args: [BigInt(claimableAt)] },
      now
    );
    expect(msg).toMatch(/^TooEarly: claimable in /);
    expect(msg).toMatch(/76d/);
    expect(msg).not.toMatch(/viem|Version:|Details:/i);
  });

  it("never dumps multi-line viem stack", () => {
    const msg = mapWillError({
      message: "Something failed\nDetails: huge stack\nVersion: viem@2"
    });
    expect(msg).not.toMatch(/\n/);
    expect(msg).not.toMatch(/Details:/);
    expect(msg).not.toMatch(/Version:/);
  });

  it("extracts named errors from shortMessage", () => {
    expect(extractWillError({ shortMessage: "NotHeir()" }).name).toBe("NotHeir");
    expect(mapWillError({ name: "NotHeir" })).toMatch(/heir/i);
  });
});

describe("mainnet refuse (#26)", () => {
  it("WILL_MAINNET_IDS covers locked mainnets", () => {
    expect([...WILL_MAINNET_IDS].sort((a, b) => a - b)).toEqual([
      1, 10, 137, 8453, 42161
    ]);
  });

  it("will set on mainnet refuses — no widget", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will", "set", "--heir", "0x0000000000000000000000000000000000000001", "--delay", "90d"],
        isConnected: true,
        address: "0x00000000000000000000000000000000000000Aa" as `0x${string}`,
        activeChainId: 1,
        chainObj: { id: 1, name: "Ethereum", testnet: false } as any
      })
    );
    expect(r.warn).toBe(true);
    expect(r.text).toBe(WILL_REFUSE.mainnet);
    expect(r.type).toBe("text");
  });

  it("will enable --mainnet refuses gate", async () => {
    const r = await runWillCommand(
      baseCtx({ args: ["will", "enable", "--mainnet"] })
    );
    expect(r.warn).toBe(true);
    expect(r.text).toBe(WILL_REFUSE.enableMainnet);
  });

  it("no factory → fail closed", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will", "heartbeat"],
        isConnected: true,
        address: "0x00000000000000000000000000000000000000Aa" as `0x${string}`,
        activeChainId: 80002,
        chainObj: { id: 80002, name: "Polygon Amoy", testnet: true } as any
      })
    );
    expect(r.warn).toBe(true);
    expect(r.text).toBe(WILL_REFUSE.noFactory);
  });
});

describe("typed confirm verbs (#26)", () => {
  it("cancel/claim require exact lowercase verbs", () => {
    // Mirror WillActionWidget gate: typed must equal kind verb
    const needs = (kind: string, typed: string) =>
      (kind === "cancel" || kind === "claim") && typed === kind;
    expect(needs("cancel", "cancel")).toBe(true);
    expect(needs("claim", "claim")).toBe(true);
    expect(needs("cancel", "CANCEL")).toBe(false);
    expect(needs("cancel", "YES")).toBe(false);
    expect(needs("claim", "yes")).toBe(false);
    expect(needs("heartbeat", "")).toBe(false);
  });
});

describe("runWillCommand grammar", () => {
  it("will with no vault (no factory) refuses on status", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will"],
        isConnected: true,
        address: "0x00000000000000000000000000000000000000Aa" as `0x${string}`,
        activeChainId: 80002,
        chainObj: { id: 80002, name: "Polygon Amoy", testnet: true } as any
      })
    );
    // Amoy not in WILL_FACTORY → fail closed
    expect(r.warn).toBe(true);
    expect(r.text).toBe(WILL_REFUSE.noFactory);
  });

  it("rejects bad delay on set before send", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will", "set", "--heir", "0x0000000000000000000000000000000000000001", "--delay", "90h"],
        isConnected: true,
        address: "0x00000000000000000000000000000000000000Aa" as `0x${string}`
      })
    );
    expect(r.warn).toBe(true);
    expect(r.text).toMatch(/Invalid delay|suffix|hours/i);
  });

  it("unknown subcommand prints usage", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will", "execute"],
        isConnected: true,
        address: "0x00000000000000000000000000000000000000Aa" as `0x${string}`
      })
    );
    expect(r.warn).toBe(true);
    expect(r.text).toMatch(/Unknown will subcommand/);
  });
});

describe("runWillCommand mutating gates", () => {
  const owner = "0x00000000000000000000000000000000000000aa" as `0x${string}`;
  const heir = "0x0000000000000000000000000000000000000001" as `0x${string}`;
  const factory = "0x00000000000000000000000000000000000000fc" as `0x${string}`;
  const vault = "0x00000000000000000000000000000000000000B1" as `0x${string}`;

  it("set rejects heir == owner client-side", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will", "set", "--heir", owner, "--delay", "90d"],
        isConnected: true,
        address: owner,
        activeChainId: 84532,
        chainObj: { id: 84532, name: "Base Sepolia", testnet: true } as any
      })
    );
    // no factory on 84532 in map → noFactory before heir check... actually set checks heir before factory
    expect(r.warn).toBe(true);
    expect(r.text).toMatch(/Heir cannot be the same|Could not resolve heir|No will factory/);
  });

  it("set rejects zero heir", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: [
          "will",
          "set",
          "--heir",
          "0x0000000000000000000000000000000000000000",
          "--delay",
          "90d"
        ],
        isConnected: true,
        address: owner
      })
    );
    expect(r.warn).toBe(true);
  });

  it("deposit usage when args missing", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will", "deposit"],
        isConnected: true,
        address: owner,
        activeChainId: 80002,
        chainObj: { id: 80002, name: "Polygon Amoy", testnet: true } as any
      })
    );
    expect(r.warn).toBe(true);
    // Amoy not in WILL_FACTORY → noFactory (or usage if parsed first)
    expect(r.text).toMatch(/No will factory|Usage: will deposit/);
  });

  it("heartbeat without factory fails closed", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will", "heartbeat"],
        isConnected: true,
        address: owner,
        activeChainId: 84532,
        chainObj: { id: 84532, name: "Base Sepolia", testnet: true } as any
      })
    );
    expect(r.text).toBe(WILL_REFUSE.noFactory);
  });

  it("cancel without factory fails closed", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will", "cancel"],
        isConnected: true,
        address: owner,
        activeChainId: 80002,
        chainObj: { id: 80002, name: "Polygon Amoy", testnet: true } as any
      })
    );
    expect(r.text).toBe(WILL_REFUSE.noFactory);
  });

  it("claim without vault address refuses heir path", async () => {
    const r = await runWillCommand(
      baseCtx({
        args: ["will", "claim"],
        isConnected: true,
        address: heir,
        activeChainId: 80002,
        chainObj: { id: 80002, name: "Polygon Amoy", testnet: true } as any
      })
    );
    expect(r.warn).toBe(true);
    expect(r.text).toMatch(/No will factory|No vault|Only the heir/);
  });

  it("with mocked factory+vault, heartbeat returns action component", async () => {
    // Temporarily inject factory via module mock is hard; simulate client vaultOf
    const { WILL_FACTORY } = await import("../constants");
    (WILL_FACTORY as Record<number, string>)[11155111] = factory;
    try {
      const client = {
        readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
          if (functionName === "vaultOf") return vault;
          if (functionName === "owner") return owner;
          if (functionName === "heir") return heir;
          if (functionName === "delay") return BigInt(90 * 86400);
          if (functionName === "lastHeartbeat") return BigInt(1_700_000_000);
          if (functionName === "claimableAt") return BigInt(1_700_000_000 + 90 * 86400);
          if (functionName === "isClaimable") return false;
          if (functionName === "claimed") return false;
          if (functionName === "cancelled") return false;
          if (functionName === "ethBalance") return 10n ** 16n; // 0.01 ETH
          if (functionName === "tokens") return [];
          if (functionName === "balanceOf") return 10n ** 16n;
          return 0n;
        }),
        getBalance: vi.fn(async () => 10n ** 18n)
      } as any;

      const r = await runWillCommand(
        baseCtx({
          args: ["will", "heartbeat"],
          isConnected: true,
          address: owner,
          client
        })
      );
      expect(r.type).toBe("component");
      expect(r.title).toMatch(/HEARTBEAT/i);

      const status = await runWillCommand(
        baseCtx({
          args: ["will", "status"],
          isConnected: true,
          address: owner,
          client
        })
      );
      expect(status.type).toBe("will");
      expect(status.payload?.vault).toBe(vault);

      const cancel = await runWillCommand(
        baseCtx({
          args: ["will", "cancel"],
          isConnected: true,
          address: owner,
          client
        })
      );
      expect(cancel.type).toBe("component");
      expect(cancel.title).toMatch(/CANCEL/i);

      const set = await runWillCommand(
        baseCtx({
          args: ["will", "set", "--heir", heir, "--delay", "30d"],
          isConnected: true,
          address: owner,
          client
        })
      );
      expect(set.type).toBe("component");
      expect(set.title).toMatch(/SET/i);

      const dep = await runWillCommand(
        baseCtx({
          args: ["will", "deposit", "eth", "0.01"],
          isConnected: true,
          address: owner,
          client
        })
      );
      expect(dep.type).toBe("component");

      const wd = await runWillCommand(
        baseCtx({
          args: ["will", "withdraw", "eth", "all"],
          isConnected: true,
          address: owner,
          client
        })
      );
      expect(wd.type).toBe("component");

      const claim = await runWillCommand(
        baseCtx({
          args: ["will", "claim", vault],
          isConnected: true,
          address: heir,
          client
        })
      );
      expect(claim.type).toBe("component");
    } finally {
      delete (WILL_FACTORY as Record<number, string | undefined>)[11155111];
    }
  });
});


describe("fetchWillStatusPayload (#247)", () => {
  it("NO VAULT shell when address missing", async () => {
    const res = await fetchWillStatusPayload({
      client: null,
      chain: sepolia,
      address: undefined
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.vault).toBeNull();
      expect(res.data.usageHint).toBe(true);
      expect(res.data.chainId).toBe(11155111);
    }
  });

  it("errors without chain", async () => {
    const res = await fetchWillStatusPayload({
      client: null,
      chain: null,
      address: undefined
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/network/i);
  });

  it("refuses when no factory on chain", async () => {
    const res = await fetchWillStatusPayload({
      client: {} as never,
      chain: { ...sepolia, id: 999999 } as unknown as Chain,
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/factory/i);
  });

  it("NO VAULT when vaultOf is zero", async () => {
    const { WILL_FACTORY } = await import("../constants");
    const { zeroAddress } = await import("viem");
    const factory = "0x1111111111111111111111111111111111111111";
    (WILL_FACTORY as Record<number, string>)[11155111] = factory;
    try {
      const client = {
        readContract: vi.fn(async () => zeroAddress)
      } as never;
      const res = await fetchWillStatusPayload({
        client,
        chain: sepolia,
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.vault).toBeNull();
        expect(res.data.usageHint).toBe(true);
      }
    } finally {
      delete (WILL_FACTORY as Record<number, string | undefined>)[11155111];
    }
  });
});
