/**
 * @file groupChat.test.ts
 * @description Unit tests for gchat local store + usage (#77).
 */
import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import {
  GCHAT_USAGE,
  groupId,
  loadGroupStore,
  saveGroupStore,
  upsertGroup
} from "./groupChat";
import { handleGchat } from "./gchatCommands";

describe("groupChat store", () => {
  it("round-trips bookmarks", () => {
    const mem: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      }
    } as unknown as Storage;
    const addr = getAddress("0x1111111111111111111111111111111111111111");
    let store = loadGroupStore(storage);
    store = upsertGroup(store, { chainId: 11155111, address: addr, name: "crew" });
    store = { ...store, lastOpenedId: groupId(11155111, addr) };
    saveGroupStore(store, storage);
    const loaded = loadGroupStore(storage);
    expect(loaded.groups).toHaveLength(1);
    expect(loaded.groups[0].name).toBe("crew");
    expect(loaded.lastOpenedId).toBe(`11155111:${addr.toLowerCase()}`);
  });
});

describe("handleGchat bare usage", () => {
  it("prints usage and does not open a panel", async () => {
    const log = await handleGchat(["gchat"], {
      generateId: () => "id",
      isConnected: false,
      address: undefined,
      activeChainId: null,
      getClient: () => {
        throw new Error("no client");
      },
      writeContractAsync: async () => "0x" as `0x${string}`,
      ensureWalletChain: async () => ({ ok: true as const }),
      signMessageActive: async () => "0x" as `0x${string}`,
      resolveEnsOrAddress: async () => null,
      shortAddress: (a) => a,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      } as unknown as Storage
    });
    const entry = Array.isArray(log) ? log[0] : log;
    expect(entry.type).toBe("text");
    expect(String((entry as { text?: string }).text)).toContain("Usage: gchat");
    expect(String((entry as { text?: string }).text)).toBe(GCHAT_USAGE);
  });

  it("fail-closes create on mainnet", async () => {
    const log = await handleGchat(["gchat", "create", "crew"], {
      generateId: () => "id",
      isConnected: true,
      address: getAddress("0x2222222222222222222222222222222222222222"),
      activeChainId: 1,
      getClient: () => {
        throw new Error("no client");
      },
      writeContractAsync: async () => "0x" as `0x${string}`,
      ensureWalletChain: async () => ({ ok: true as const }),
      signMessageActive: async () => "0x" as `0x${string}`,
      resolveEnsOrAddress: async () => null,
      shortAddress: (a) => a.slice(0, 8),
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      } as unknown as Storage
    });
    const entry = Array.isArray(log) ? log[0] : log;
    expect(String((entry as { text?: string }).text)).toMatch(/testnet-only/i);
  });
});
