/**
 * @file agent.test.ts
 * @description Agent key persist + extraAgents presence (#190)
 */
import { describe, expect, it } from "vitest";
import {
  clearAgentKey,
  getOrCreateAgentKey,
  getStoredAgentKey,
  isAgentInExtraAgents,
  truncateAddr
} from "./agent";

function memStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
    getItem(k: string) {
      return store[k] ?? null;
    },
    setItem(k: string, v: string) {
      store[k] = v;
    },
    removeItem(k: string) {
      delete store[k];
    },
    key() {
      return null;
    }
  } as Storage;
}

describe("agent key (#190)", () => {
  it("creates and reuses per network", () => {
    const s = memStorage();
    const a = getOrCreateAgentKey(s, "0xAbc", "testnet");
    const b = getOrCreateAgentKey(s, "0xAbc", "testnet");
    expect(a.privateKey).toBe(b.privateKey);
    expect(a.address).toBe(b.address);
    const other = getOrCreateAgentKey(s, "0xAbc", "mainnet");
    expect(other.privateKey).not.toBe(a.privateKey);
  });

  it("clears local key", () => {
    const s = memStorage();
    getOrCreateAgentKey(s, "0xAbc", "testnet");
    clearAgentKey(s, "0xAbc", "testnet");
    expect(getStoredAgentKey(s, "0xAbc", "testnet")).toBeNull();
  });

  it("treats presence in extraAgents as approved (no .approved flag)", () => {
    expect(
      isAgentInExtraAgents(
        [{ address: "0xAAA", name: "x", validUntil: 1 }],
        "0xaaa"
      )
    ).toBe(true);
    expect(isAgentInExtraAgents([{ approved: true }], "0xaaa")).toBe(false);
    expect(isAgentInExtraAgents(null, "0xaaa")).toBe(false);
  });

  it("truncates addresses", () => {
    expect(truncateAddr("0x1234567890abcdef1234")).toMatch(/…/);
  });
});
