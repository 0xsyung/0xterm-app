/**
 * @file activeWrite.test.ts
 * @description Active write helpers (#29 tip)
 */
import { describe, expect, it } from "vitest";
import { mainnet } from "viem/chains";
import {
  assertSignerChain,
  buildWriteConfirm,
  hasActiveWallet,
  localWriteContract,
  localSendTransaction
} from "./activeWrite";
import { WalletError } from "./types";

describe("hasActiveWallet", () => {
  it("passes for local or injected", () => {
    expect(hasActiveWallet({ localUnlocked: true, injectedConnected: false })).toBe(true);
    expect(hasActiveWallet({ localUnlocked: false, injectedConnected: true })).toBe(true);
    expect(hasActiveWallet({ localUnlocked: false, injectedConnected: false })).toBe(false);
  });
});

describe("buildWriteConfirm", () => {
  it("formats zero and non-zero value", () => {
    const z = buildWriteConfirm({
      to: "0x1111111111111111111111111111111111111111",
      summary: "board post",
      chain: mainnet
    });
    expect(z.value).toMatch(/^0 /);
    expect(z.chainLabel).toContain("1");
    const v = buildWriteConfirm({
      to: "0x1111111111111111111111111111111111111111",
      summary: "board post",
      value: 10n ** 18n,
      chain: mainnet,
      gas: "21000"
    });
    expect(v.value).toMatch(/^1 /);
    expect(v.gas).toBe("21000");
    const frac = buildWriteConfirm({
      to: "0x1111111111111111111111111111111111111111",
      summary: "swap",
      value: 10n ** 18n + 123456789012345678n,
      chain: mainnet
    });
    expect(frac.value).toMatch(/^1\.123456 /);
  });
});

describe("assertSignerChain", () => {
  it("checks local only", () => {
    expect(() =>
      assertSignerChain(
        { kind: "injected", address: "0x1111111111111111111111111111111111111111" },
        1,
        8453
      )
    ).not.toThrow();
    expect(() =>
      assertSignerChain(
        {
          kind: "local",
          address: "0x1111111111111111111111111111111111111111",
          account: {} as never,
          walletClient: {} as never
        },
        1,
        8453,
        "Ethereum"
      )
    ).toThrow(WalletError);
  });
});

describe("localWriteContract / localSendTransaction", () => {
  it("rejects chain mismatch", async () => {
    const fakeClient = {
      account: { address: "0x1111111111111111111111111111111111111111" },
      writeContract: async () => "0xabc" as const,
      sendTransaction: async () => "0xdef" as const
    };
    await expect(
      localWriteContract(fakeClient as never, mainnet, {
        chainId: 8453,
        address: "0x1111111111111111111111111111111111111111",
        abi: [],
        functionName: "foo"
      })
    ).rejects.toThrow(WalletError);
    await expect(
      localSendTransaction(fakeClient as never, mainnet, {
        chainId: 8453,
        to: "0x1111111111111111111111111111111111111111"
      })
    ).rejects.toThrow(WalletError);
  });

  it("passes matching chain to walletClient", async () => {
    const calls: unknown[] = [];
    const fakeClient = {
      account: { address: "0x1111111111111111111111111111111111111111" },
      writeContract: async (req: unknown) => {
        calls.push(req);
        return "0xabc" as `0x${string}`;
      },
      sendTransaction: async (req: unknown) => {
        calls.push(req);
        return "0xdef" as `0x${string}`;
      }
    };
    const wh = await localWriteContract(fakeClient as never, mainnet, {
      chainId: 1,
      address: "0x2222222222222222222222222222222222222222",
      abi: ["fn"],
      functionName: "post",
      args: [1n],
      value: 0n
    });
    expect(wh).toBe("0xabc");
    expect((calls[0] as { chain: { id: number } }).chain.id).toBe(1);
    const sh = await localSendTransaction(fakeClient as never, mainnet, {
      chainId: 1,
      to: "0x3333333333333333333333333333333333333333",
      data: "0x",
      value: 1n
    });
    expect(sh).toBe("0xdef");
    expect((calls[1] as { chain: { id: number } }).chain.id).toBe(1);
  });
});
