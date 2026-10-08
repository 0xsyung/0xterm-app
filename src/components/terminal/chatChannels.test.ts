/**
 * @file chatChannels.test.ts
 * @description Unit tests for channel id / resolve / persist / verify (#58).
 */
import { describe, expect, it, vi } from "vitest";
import {
  activeChannelChipLabel,
  activeChannelSuccessMsg,
  notChatContractMsg,
  savedChannelSuccessMsg,
  bootActiveChannel,
  channelId,
  effectiveActiveChannelId,
  exportChannelsPayload,
  formatChannelLabel,
  getActiveChannel,
  importChannelsPayload,
  listChannelsOrdered,
  loadChannelStore,
  mergeChannelLists,
  NO_ACTIVE_CHANNEL_MSG,
  resolveChannelUse,
  saveChannelStore,
  shortAddress,
  verifyChatContract,
  wrongChainMsg,
  type ChatChannel,
  type ChannelStore,
} from "./chatChannels";

function memStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
  } as Storage;
}

const lobby: ChatChannel = {
  chainId: 11155111,
  address: "0x694eA7938238037731bD0F3a3aE9F6FD2C2097ce",
  name: "lobby",
  source: "preset",
};

const room: ChatChannel = {
  chainId: 11155111,
  address: "0x1111111111111111111111111111111111111111",
  name: "my-room",
  source: "saved",
};

const lobby2: ChatChannel = {
  chainId: 11155111,
  address: "0x2222222222222222222222222222222222222222",
  name: "lobby",
  source: "saved",
};

describe("channelId / labels", () => {
  it("keys by chainId + lowercase address", () => {
    expect(channelId(11155111, "0xAbC0000000000000000000000000000000000001")).toBe(
      "11155111:0xabc0000000000000000000000000000000000001"
    );
  });

  it("shortAddress + formatChannelLabel disambiguates duplicates", () => {
    expect(shortAddress(lobby.address)).toMatch(/^0x694e…/);
    expect(formatChannelLabel(lobby)).toBe("lobby");
    expect(
      formatChannelLabel(lobby, { disambiguate: true, all: [lobby, lobby2] })
    ).toMatch(/^lobby · 0x694e…/);
    expect(formatChannelLabel({ ...lobby, name: "" })).toMatch(/^0x694e…/);
    expect(activeChannelChipLabel(null, [])).toBe("—");
  });
});

describe("resolveChannelUse", () => {
  const store: ChannelStore = { channels: [room, lobby2], activeId: null };

  it("exact name match (case-insensitive)", () => {
    const r = resolveChannelUse("MY-ROOM", store, 11155111);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.channel.address).toBe(room.address);
  });

  it("address on active chain", () => {
    const r = resolveChannelUse(room.address, store, 11155111);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.channel.address.toLowerCase()).toBe(room.address.toLowerCase());
  });

  it("duplicate names → choices", () => {
    const r = resolveChannelUse("lobby", store, 11155111);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("choices");
      expect(r.choices!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("close matches → choices", () => {
    const r = resolveChannelUse("room", store, 11155111);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("choices");
  });
});

describe("persist / boot / export", () => {
  it("round-trips saved channels + active id", () => {
    const storage = memStorage();
    const store: ChannelStore = {
      channels: [room],
      activeId: channelId(room.chainId, room.address),
    };
    saveChannelStore(storage, store);
    const loaded = loadChannelStore(storage);
    expect(loaded.channels).toHaveLength(1);
    expect(loaded.activeId).toBe(store.activeId);
    expect(getActiveChannel(loaded)?.name).toBe("my-room");
  });

  it("boot restores active, else preset for network", () => {
    const withActive: ChannelStore = {
      channels: [room],
      activeId: channelId(room.chainId, room.address),
    };
    expect(bootActiveChannel(withActive, 11155111)?.name).toBe("my-room");
    expect(bootActiveChannel({ channels: [], activeId: null }, 11155111)?.name).toBe(
      "lobby"
    );
    expect(bootActiveChannel({ channels: [], activeId: null }, 1)).toBeNull();
  });

  it("export/import merges channels", () => {
    const current: ChannelStore = { channels: [room], activeId: null };
    const payload = exportChannelsPayload({
      channels: [lobby2],
      activeId: channelId(lobby2.chainId, lobby2.address),
    });
    const next = importChannelsPayload(payload, current);
    expect(next.channels.length).toBe(2);
    expect(next.activeId).toBe(payload.activeId);
  });

  it("listChannelsOrdered: presets then saved", () => {
    const ordered = listChannelsOrdered({ channels: [room], activeId: null });
    expect(ordered[0].source).toBe("preset");
    expect(ordered.some((c) => c.name === "my-room")).toBe(true);
  });
});

describe("verifyChatContract", () => {
  it("rejects empty code", async () => {
    const client = {
      getCode: vi.fn(async () => "0x"),
      readContract: vi.fn(),
    } as any;
    const r = await verifyChatContract(client, room.address);
    expect(r.ok).toBe(false);
  });

  it("accepts fee + optional name + getPublicKey", async () => {
    const client = {
      getCode: vi.fn(async () => "0x6000"),
      readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
        if (functionName === "fee") return 100000000000000n;
        if (functionName === "name") return "lobby";
        if (functionName === "getPublicKey") return "0x";
        throw new Error("unexpected " + functionName);
      }),
    } as any;
    const r = await verifyChatContract(client, room.address);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.name).toBe("lobby");
  });

  it("tolerates missing name() for legacy presets", async () => {
    const client = {
      getCode: vi.fn(async () => "0x6000"),
      readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
        if (functionName === "fee") return 1n;
        if (functionName === "name") throw new Error("no name");
        if (functionName === "getPublicKey") return "0x";
        throw new Error("unexpected");
      }),
    } as any;
    const r = await verifyChatContract(client, room.address);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.name).toBe("");
  });
});

describe("copy helpers", () => {
  it("exposes Designer fail-closed strings", () => {
    expect(NO_ACTIVE_CHANNEL_MSG).toMatch(/No active chat channel/);
    expect(wrongChainMsg(lobby)).toMatch(/Channel is on/);
  });

  it("mergeChannelLists prefers preset source", () => {
    const merged = mergeChannelLists([lobby], [{ ...lobby, name: "x", source: "saved" }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("preset");
  });
});

describe("effectiveActiveChannelId (#172)", () => {
  const LOBBY_ID = channelId(11155111, "0x6248F070A2f849ee1410BC35aa86A0e0F08e96a5");
  const empty: ChannelStore = { channels: [], activeId: null };

  it("returns the saved active channel id when it is known", () => {
    const store: ChannelStore = {
      channels: [room],
      activeId: channelId(room.chainId, room.address),
    };
    expect(effectiveActiveChannelId(store, 11155111)).toBe(store.activeId);
    // Saved active wins even on a chain with no preset / no chain.
    expect(effectiveActiveChannelId(store, 1)).toBe(store.activeId);
    expect(effectiveActiveChannelId(store, null)).toBe(store.activeId);
  });

  it("falls back to the current network preset (Sepolia lobby) when nothing is saved", () => {
    expect(effectiveActiveChannelId(empty, 11155111)).toBe(LOBBY_ID);
  });

  it("falls back to the preset when the saved active id is unknown", () => {
    const stale: ChannelStore = { channels: [], activeId: "11155111:0xdead" };
    expect(effectiveActiveChannelId(stale, 11155111)).toBe(LOBBY_ID);
  });

  it("returns null with no saved channel and no preset for the chain", () => {
    expect(effectiveActiveChannelId(empty, 1)).toBeNull();
    expect(effectiveActiveChannelId(empty, null)).toBeNull();
    expect(effectiveActiveChannelId(empty, undefined)).toBeNull();
  });

  it("matches bootActiveChannel (same rule as the CHAT label)", () => {
    const ch = bootActiveChannel(empty, 11155111)!;
    expect(effectiveActiveChannelId(empty, 11155111)).toBe(
      channelId(ch.chainId, ch.address)
    );
  });
});

describe("chatChannels small helpers (coverage)", () => {
  it("chip label is an em dash with no active channel", () => {
    expect(activeChannelChipLabel(null, [])).toBe("—");
  });

  it("success / not-chat copy strings", () => {
    expect(activeChannelSuccessMsg(room)).toBe(
      `[✓] Active channel: my-room · Sepolia · ${room.address}`
    );
    expect(savedChannelSuccessMsg(room)).toBe(
      `[✓] Channel saved: my-room · Sepolia · ${room.address}`
    );
    expect(notChatContractMsg("0xabc")).toBe("[!] Not a Chat contract at 0xabc — not saved.");
  });

  it("mergeChannelLists adds recent only when unknown", () => {
    const other: ChatChannel = { ...room, address: "0x4444444444444444444444444444444444444444" };
    const merged = mergeChannelLists([lobby], [room], [room, other]);
    expect(merged.map((c) => c.source)).toEqual(["preset", "saved", "recent"]);
  });

  it("resolveChannelUse: empty query and address with no network", () => {
    const store: ChannelStore = { channels: [], activeId: null };
    const empty = resolveChannelUse("   ", store, 11155111);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe("empty");
    const noNet = resolveChannelUse(room.address, store, null);
    expect(noNet.ok).toBe(false);
    if (!noNet.ok) expect(noNet.message).toMatch(/Set a network first/);
  });

  it("verifyChatContract reports getCode / fee / getPublicKey failures", async () => {
    const mk = (fail: string) =>
      ({
        getCode: vi.fn(async () => {
          if (fail === "code") throw new Error("rpc");
          return "0x6000";
        }),
        readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
          if (functionName === fail) throw new Error("revert");
          if (functionName === "fee") return 1n;
          if (functionName === "name") return "x";
          return "0x";
        }),
      }) as unknown as Parameters<typeof verifyChatContract>[0];
    expect(await verifyChatContract(mk("code"), room.address)).toEqual({
      ok: false,
      reason: "code check failed",
    });
    expect(await verifyChatContract(mk("fee"), room.address)).toEqual({
      ok: false,
      reason: "fee() failed",
    });
    expect(await verifyChatContract(mk("getPublicKey"), room.address)).toEqual({
      ok: false,
      reason: "getPublicKey() failed",
    });
  });
});
