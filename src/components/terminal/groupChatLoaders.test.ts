/**
 * @file groupChatLoaders.test.ts
 */
import { describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";
import { listGroupSummaries, fetchGroupThread } from "./groupChatLoaders";
import { saveGroupSecret, saveGroupStore } from "./groupChat";

describe("listGroupSummaries", () => {
  it("marks dead groups from alive()", async () => {
    const addr = getAddress("0x4444444444444444444444444444444444444444");
    const client = {
      readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
        if (functionName === "alive") return false;
        if (functionName === "name") return "crew";
        if (functionName === "memberCount") return 0n;
        throw new Error(functionName);
      })
    };
    const list = await listGroupSummaries(client, 11155111, [
      { chainId: 11155111, address: addr, name: "crew" }
    ]);
    expect(list).toEqual([
      { address: addr, name: "crew", memberCount: 0, dead: true }
    ]);
  });
});

describe("fetchGroupThread", () => {
  it("surfaces [dead] path via decryptFailed when !alive", async () => {
    const group = getAddress("0x5555555555555555555555555555555555555555");
    const self = getAddress("0x6666666666666666666666666666666666666666");
    const mem: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: () => {},
      length: 0,
      clear: () => {},
      key: () => null
    } as unknown as Storage;
    // stub localStorage used inside loadGroupSecret
    vi.stubGlobal("localStorage", storage);
    saveGroupStore(
      { groups: [{ chainId: 11155111, address: group, name: "g" }], lastOpenedId: null },
      storage
    );
    const secret = new Uint8Array(32);
    saveGroupSecret(11155111, group, secret, storage);

    const client = {
      readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
        switch (functionName) {
          case "name":
            return "g";
          case "alive":
            return false;
          case "getMembers":
            return [self];
          case "owner":
            return self;
          case "isMember":
            return true;
          case "messageCount":
            return 1n;
          case "getMessages":
            return [
              {
                from: self,
                timestamp: 1n,
                iv: ("0x" + "11".repeat(12)) as `0x${string}`,
                senderKey: ("0x" + "02" + "00".repeat(32)) as `0x${string}`,
                ciphertext: ("0x" + "aa".repeat(32)) as `0x${string}`
              }
            ];
          default:
            throw new Error(functionName);
        }
      })
    };
    const thread = await fetchGroupThread(client, group, self, {
      chainId: 11155111,
      signMessage: async () => ("0x" + "ab".repeat(65)) as `0x${string}`
    });
    expect(thread.dead).toBe(true);
    expect(thread.messages[0]?.decryptFailed).toBe(true);
    vi.unstubAllGlobals();
  });
});
