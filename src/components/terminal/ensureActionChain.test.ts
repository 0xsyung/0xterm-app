/**
 * @file ensureActionChain.test.ts
 * @description PR #157 must-fix — writes on a resolved action chain switch the
 *   wallet first (switchChainAsync) and pass `chainId` (hard-stop on mismatch).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resolveActionChain } from "./actionNetworks";
import {
  ensureChainForAction,
  formatChainSwitchFailed
} from "./ensureActionChain";

const BASE = 8453;
const SEPOLIA = 11155111;

describe("ensureChainForAction (#157)", () => {
  it("switches the wallet to the resolved override chain (default=Base, board override=Sepolia)", async () => {
    const resolved = resolveActionChain("board", BASE, { board: SEPOLIA });
    expect(resolved).toMatchObject({ chainId: SEPOLIA, usedOverride: true });

    const switchChainAsync = vi.fn().mockResolvedValue(undefined);
    const res = await ensureChainForAction(resolved.chainId, {
      walletChainId: BASE,
      switchChainAsync
    });
    expect(switchChainAsync).toHaveBeenCalledTimes(1);
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: SEPOLIA });
    expect(res).toEqual({ ok: true, chainId: SEPOLIA, switched: true });
  });

  it("does not prompt a switch when the wallet is already on the resolved chain", async () => {
    const switchChainAsync = vi.fn();
    const res = await ensureChainForAction(SEPOLIA, {
      walletChainId: SEPOLIA,
      switchChainAsync
    });
    expect(switchChainAsync).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true, chainId: SEPOLIA, switched: false });
  });

  it("hard-stops (ok=false, tx not sent) when the wallet rejects the switch", async () => {
    const switchChainAsync = vi
      .fn()
      .mockRejectedValue(new Error("User rejected the request."));
    const write = vi.fn();
    const res = await ensureChainForAction(SEPOLIA, {
      walletChainId: BASE,
      switchChainAsync
    });
    if (res.ok) write();
    expect(write).not.toHaveBeenCalled();
    expect(res).toEqual({
      ok: false,
      error: formatChainSwitchFailed(SEPOLIA, BASE)
    });
    if (!res.ok) expect(res.error).toMatch(/Tx not sent/);
  });

  it("switches when the wallet chain is unknown (not connected chain reported)", async () => {
    const switchChainAsync = vi.fn().mockResolvedValue(undefined);
    const res = await ensureChainForAction(BASE, {
      walletChainId: undefined,
      switchChainAsync
    });
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: BASE });
    expect(res.ok).toBe(true);
  });

  it("refuses with no resolved chain (no switch, no tx)", async () => {
    const switchChainAsync = vi.fn();
    const res = await ensureChainForAction(null, {
      walletChainId: BASE,
      switchChainAsync
    });
    expect(switchChainAsync).not.toHaveBeenCalled();
    expect(res.ok).toBe(false);
  });
});

/**
 * Source-level regression guard: TerminalShell is too large to mount in a unit
 * test with a live wagmi config, so assert structurally that every guarded
 * command path calls `ensureWalletChain` (→ ensureChainForAction) before its
 * write, and that every write passes `chainId` (wagmi/viem assertChainId).
 */
describe("TerminalShell write paths use ensureChainForAction + chainId (#157)", () => {
  const src = readFileSync(join(__dirname, "TerminalShell.tsx"), "utf8");

  // #29 tip: local path uses writeContractActive / sendTransactionActive (still pass chainId)
  const WRITE_RE =
    /(writeContractAsync|sendTransactionAsync|writeContractActive|sendTransactionActive)\(\s*\{/g;

  /** Return the `{ ... }` argument literal starting right after `({`. */
  const argLiteral = (text: string, from: number): string => {
    let depth = 1;
    let i = from;
    while (depth > 0 && i < text.length) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }
    return text.slice(from, i);
  };

  /** Slice from a start marker to the next top-level command / helper. */
  const section = (startMarker: RegExp): { text: string; offset: number } => {
    const m = startMarker.exec(src);
    if (!m) throw new Error(`marker not found: ${startMarker}`);
    const offset = m.index;
    const rest = src.slice(offset + m[0].length);
    // next sibling at the marker's own indent (command key or 2-space helper)
    const indent = m[0].replace(/^\n/, "").match(/^ */)![0].length;
    const end = rest.search(
      new RegExp(
        `\\n {${indent}}(?:[a-zA-Z_]+: (?:async )?\\(|commands\\.[a-zA-Z_]+ = |const [a-zA-Z_]+ = )`
      )
    );
    return {
      text: src.slice(offset, offset + m[0].length + (end < 0 ? rest.length : end)),
      offset
    };
  };

  it("helper is wired to switchChainAsync + live wallet chain", () => {
    expect(src).toMatch(/import \{ ensureChainForAction \} from "\.\/ensureActionChain"/);
    // #29: ensureWalletChain is async — local unlocked skips AppKit switch, else ensureChainForAction
    expect(src).toMatch(/const ensureWalletChain = async \(chainId/);
    expect(src).toMatch(/ensureChainForAction\(chainId, \{\s*walletChainId: walletChainIdRef\.current,\s*switchChainAsync\s*\}\)/);
  });

  it("every writeContractAsync / sendTransactionAsync passes chainId", () => {
    const missing: number[] = [];
    let count = 0;
    for (const m of src.matchAll(WRITE_RE)) {
      count++;
      const lit = argLiteral(src, m.index! + m[0].length);
      if (!/^\s*chainId\b/m.test(lit)) {
        missing.push(src.slice(0, m.index).split("\n").length);
      }
    }
    expect(count).toBeGreaterThanOrEqual(8);
    expect(missing).toEqual([]);
  });

  const GUARDED: Array<[string, RegExp, string[]]> = [
    ["chat (setPublicKey, sendMessage)", /\n {4}chat: async \(args\) => \{/, ["setPublicKey", "sendMessage"]],
    ["board post", /\n {4}board: async \(args\) => \{/, ["post"]],
    ["share / unshare", /\n {4}share: async \(args\) => \{/, ["unshare", "share"]],
    ["ens set / clear", /\n {4}ens: async \(args\) => \{/, []],
    ["dig deploy / send", /\n {4}dig: async \(args\) => \{/, []],
    ["feedback (chat channel)", /\n {2}const sendFeedbackChat = async/, ["setPublicKey", "sendMessage"]],
    ["channel deploy", /\n {2}commands\.channel = async \(args\) => \{/, ["deploy"]]
  ];

  it.each(GUARDED)(
    "%s: ensureWalletChain runs before every write in the path",
    (_label, marker, fns) => {
      const { text } = section(marker);
      const writes = [...text.matchAll(WRITE_RE)];
      expect(writes.length).toBeGreaterThan(0);
      for (const w of writes) {
        const before = text.slice(0, w.index);
        expect(before).toMatch(/await ensureWalletChain\(/);
        const lit = argLiteral(text, w.index! + w[0].length);
        // the target passed to ensure and to the write must be the same chain
        expect(lit).toMatch(/^\s*chainId: (chain\.id|onChain\.chainId),/m);
      }
      for (const fn of fns) {
        expect(text).toContain(`functionName: "${fn}"`);
      }
    }
  );
});
