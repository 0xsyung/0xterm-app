/**
 * @file runMixer.test.ts
 * @description mixer CLI runner gates — Soft ACK #111
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMixerCommand, type MixerRunCtx } from "./runMixer";
import type { ThemeConfig } from "../types";
import { THEMES } from "../constants";
import { bytesToHex, createDepositSecrets } from "./commitment";
import { findPool } from "./constants";

vi.mock("../widgets/MixerWidget", () => ({
  default: () => null
}));
vi.mock("../widgets/MixerDepositWidget", () => ({
  default: () => null
}));
vi.mock("../widgets/MixerWithdrawWidget", () => ({
  default: () => null
}));

const theme = THEMES.matrix as ThemeConfig;

function baseCtx(over: Partial<MixerRunCtx> = {}): MixerRunCtx {
  return {
    args: ["mixer"],
    generateId: () => "id-1",
    theme,
    address: undefined,
    isConnected: false,
    activeChainId: 1,
    chainObj: { id: 1, name: "Ethereum" } as MixerRunCtx["chainObj"],
    client: null,
    onPin: () => {},
    ...over
  };
}

describe("runMixerCommand CLI gates", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("bare / help → usage synopsis", async () => {
    const a = await runMixerCommand(baseCtx({ args: ["mixer"] }));
    expect(a.type).toBe("text");
    expect(a.text).toMatch(/mixer pools/);
    expect(a.text).toMatch(/Privacy tip/i);

    const b = await runMixerCommand(baseCtx({ args: ["mixer", "help"] }));
    expect(b.text).toMatch(/mixer deposit/);
  });

  it("pools empty on unsupported chain", async () => {
    const r = await runMixerCommand(
      baseCtx({ activeChainId: 8453, chainObj: { id: 8453, name: "Base" } as any })
    );
    // need pools sub
    const r2 = await runMixerCommand(
      baseCtx({
        args: ["mixer", "pools"],
        activeChainId: 8453,
        chainObj: { id: 8453, name: "Base" } as any
      })
    );
    expect(r2.warn).toBe(true);
    expect(r2.text).toMatch(/No mixer pools on Base/);
    void r;
  });

  it("pools returns mixer log type when registry hit", async () => {
    const r = await runMixerCommand(
      baseCtx({ args: ["mixer", "pools"], activeChainId: 1 })
    );
    expect(r.type).toBe("mixer");
    expect(r.payload?.mode).toBe("pools");
    expect(r.payload?.rows?.length).toBeGreaterThan(0);
  });

  it("notes empty pinnable", async () => {
    const r = await runMixerCommand(
      baseCtx({
        args: ["mixer", "notes"],
        address: "0xabc0000000000000000000000000000000000001",
        isConnected: true
      })
    );
    expect(r.type).toBe("mixer");
    expect(r.payload?.mode).toBe("notes");
  });

  it("deposit without wallet → MIXER_NO_WALLET", async () => {
    const r = await runMixerCommand(
      baseCtx({ args: ["mixer", "deposit", "0.1"] })
    );
    expect(r.warn).toBe(true);
    expect(r.text).toBe("Wallet not connected.");
  });

  it("deposit bad amount → MIXER_BAD_AMOUNT", async () => {
    const r = await runMixerCommand(
      baseCtx({
        args: ["mixer", "deposit", "0.42"],
        isConnected: true,
        address: "0xabc0000000000000000000000000000000000001"
      })
    );
    expect(r.warn).toBe(true);
    expect(r.text).toMatch(/denomination/i);
  });

  it("deposit happy path opens component confirm", async () => {
    const r = await runMixerCommand(
      baseCtx({
        args: ["mixer", "deposit", "0.1"],
        isConnected: true,
        address: "0xabc0000000000000000000000000000000000001"
      })
    );
    expect(r.type).toBe("component");
    expect(r.title).toBe("MIXER DEPOSIT");
  });

  it("withdraw needs recipient", async () => {
    const r = await runMixerCommand(
      baseCtx({
        args: ["mixer", "withdraw", "not-a-note"],
        isConnected: true,
        address: "0xabc0000000000000000000000000000000000001",
        client: {} as any
      })
    );
    expect(r.text).toMatch(/recipient/i);
  });

  it("withdraw bad note refused before proof", async () => {
    const r = await runMixerCommand(
      baseCtx({
        args: [
          "mixer",
          "withdraw",
          "garbage",
          "0x0000000000000000000000000000000000000001"
        ],
        isConnected: true,
        address: "0xabc0000000000000000000000000000000000001",
        client: {
          readContract: vi.fn()
        } as any
      })
    );
    expect(r.text).toMatch(/Invalid or forged note/i);
  });

  it("withdraw spent note refused", async () => {
    const pool = findPool(1, "0.1")!;
    const secrets = await createDepositSecrets();
    const note = `tornado-eth-0.1-1-0x${bytesToHex(secrets.preimage)}`;
    const r = await runMixerCommand(
      baseCtx({
        args: [
          "mixer",
          "withdraw",
          note,
          "0x0000000000000000000000000000000000000001"
        ],
        isConnected: true,
        address: "0xabc0000000000000000000000000000000000001",
        client: {
          readContract: vi.fn().mockResolvedValue(true)
        } as any
      })
    );
    expect(r.text).toBe("Note already used.");
    void pool;
  });

  it("status bad note", async () => {
    const r = await runMixerCommand(
      baseCtx({
        args: ["mixer", "status", "nope"],
        client: {} as any
      })
    );
    expect(r.text).toMatch(/Invalid or forged note/i);
  });

  it("unknown subcommand", async () => {
    const r = await runMixerCommand(
      baseCtx({ args: ["mixer", "nova"] })
    );
    expect(r.text).toMatch(/Unknown mixer subcommand/);
  });
});
