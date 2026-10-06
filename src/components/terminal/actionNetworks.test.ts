/**
 * @file actionNetworks.test.ts
 * @description Unit tests for per-action network prefs (#156)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it } from "vitest";
import {
  ACTION_NETWORKS_PREF_KEY,
  ACTION_NETWORK_REGISTRY,
  READ_ACTIONS,
  WRITE_ACTIONS,
  clearAllOverrides,
  countOverrides,
  formatActionNetworkLine,
  formatDefaultCellLabel,
  formatDefaultOptionLabel,
  formatUnsupportedOverrideLabel,
  parseActionNetworkOverrides,
  resolveActionChain,
  setActionOverride,
  shortNameForChainId
} from "./actionNetworks";

describe("actionNetworks registry (#156)", () => {
  it("lists WRITE and READ actions covering shipping commands", () => {
    const writeIds = WRITE_ACTIONS.map((a) => a.id);
    const readIds = READ_ACTIONS.map((a) => a.id);
    expect(writeIds).toEqual(
      expect.arrayContaining([
        "swap",
        "arb",
        "vault",
        "dig",
        "chat",
        "board",
        "share"
      ])
    );
    expect(readIds).toEqual(
      expect.arrayContaining(["ens", "sim", "trace"])
    );
    expect(ACTION_NETWORK_REGISTRY.length).toBe(
      WRITE_ACTIONS.length + READ_ACTIONS.length
    );
  });

  it("persist key is actionNetworks", () => {
    expect(ACTION_NETWORKS_PREF_KEY).toBe("actionNetworks");
  });
});

describe("resolveActionChain", () => {
  it("returns default when no override", () => {
    const r = resolveActionChain("swap", 8453, {});
    expect(r).toEqual({ chainId: 8453, usedOverride: false });
  });

  it("override wins for that action only", () => {
    const overrides = setActionOverride({}, "swap", 1);
    expect(resolveActionChain("swap", 8453, overrides)).toEqual({
      chainId: 1,
      usedOverride: true
    });
    expect(resolveActionChain("vault", 8453, overrides)).toEqual({
      chainId: 8453,
      usedOverride: false
    });
  });

  it("changing default never clears overrides; rows on default track live", () => {
    const overrides = setActionOverride(
      setActionOverride({}, "swap", 1),
      "chat",
      11155111
    );
    // Default moves 8453 → 137; overrides stay
    expect(countOverrides(overrides)).toBe(2);
    expect(resolveActionChain("swap", 137, overrides).chainId).toBe(1);
    expect(resolveActionChain("sim", 137, overrides)).toEqual({
      chainId: 137,
      usedOverride: false
    });
    expect(formatDefaultCellLabel(137)).toBe("DEFAULT · POLYGON");
    expect(formatDefaultOptionLabel(8453)).toBe("DEFAULT (BASE)");
  });

  it("unsupported override falls back to default with warn meta", () => {
    // vault only supports mainnet (1); stash BASE SEP as override
    const overrides = { vault: 84532 } as const;
    const r = resolveActionChain("vault", 8453, { ...overrides });
    expect(r.chainId).toBe(8453);
    expect(r.usedOverride).toBe(false);
    expect(r.unsupportedOverride?.chainId).toBe(84532);
    expect(r.unsupportedOverride?.shortName).toMatch(/BASE/);
    expect(
      formatUnsupportedOverrideLabel(r.unsupportedOverride!.shortName)
    ).toMatch(/unavailable → default/);
  });

  it("clearAllOverrides empties the map", () => {
    const o = setActionOverride({}, "swap", 1);
    expect(countOverrides(clearAllOverrides())).toBe(0);
    expect(countOverrides(o)).toBe(1);
  });
});

describe("parseActionNetworkOverrides", () => {
  it("keeps known numeric action ids only", () => {
    expect(
      parseActionNetworkOverrides({
        swap: 1,
        nope: 99,
        sim: "8453",
        dig: null
      })
    ).toEqual({ swap: 1, sim: 8453 });
  });

  it("returns empty for junk", () => {
    expect(parseActionNetworkOverrides(null)).toEqual({});
    expect(parseActionNetworkOverrides([])).toEqual({});
  });
});

describe("formatActionNetworkLine", () => {
  it("formats on X / on X (override)", () => {
    expect(formatActionNetworkLine(8453, false)).toBe("on BASE");
    expect(formatActionNetworkLine(8453, true)).toBe("on BASE (override)");
    expect(formatActionNetworkLine(null, false)).toBeNull();
  });

  it("shortNameForChainId covers known chains", () => {
    expect(shortNameForChainId(8453)).toBe("BASE");
    expect(shortNameForChainId(1)).toBe("ETH");
  });
});
