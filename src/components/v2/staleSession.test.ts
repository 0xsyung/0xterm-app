/**
 * @file staleSession.test.ts
 * @description Stale-session clear gate for #310 Safari network-loop fix
 */
import { describe, expect, it } from "vitest";
import {
  STALE_SESSION_BANNER,
  shouldClearStaleSession
} from "./staleSession";

describe("shouldClearStaleSession (#310)", () => {
  it("is false when disconnected", () => {
    expect(
      shouldClearStaleSession({ isConnected: false, chainId: 11155111 })
    ).toBe(false);
    expect(
      shouldClearStaleSession({ isConnected: false, chainId: undefined })
    ).toBe(false);
  });

  it("waits for chainId hydrate — connected without chainId is not stale", () => {
    expect(
      shouldClearStaleSession({ isConnected: true, chainId: undefined })
    ).toBe(false);
    expect(
      shouldClearStaleSession({ isConnected: true, chainId: null })
    ).toBe(false);
  });

  it("clears when connected on a removed testnet / non-V2 chain", () => {
    expect(
      shouldClearStaleSession({ isConnected: true, chainId: 11155111 })
    ).toBe(true); // Sepolia
    expect(
      shouldClearStaleSession({ isConnected: true, chainId: 80002 })
    ).toBe(true); // Amoy
    expect(
      shouldClearStaleSession({ isConnected: true, chainId: 998 })
    ).toBe(true); // HyperEVM testnet
    expect(
      shouldClearStaleSession({ isConnected: true, chainId: 56 })
    ).toBe(true); // BSC — not in V2 set
  });

  it("keeps sessions on every V2 mainnet", () => {
    for (const id of [1, 42161, 8453, 137, 10, 999]) {
      expect(
        shouldClearStaleSession({ isConnected: true, chainId: id })
      ).toBe(false);
    }
  });

  it("exports stable banner copy", () => {
    expect(STALE_SESSION_BANNER).toMatch(/unsupported network/i);
    expect(STALE_SESSION_BANNER).toMatch(/Reconnect/i);
  });
});
