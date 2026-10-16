// @vitest-environment jsdom
/**
 * @file mixer.test.ts
 * @description Mixer unit tests — Soft ACK #111
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  MIXER_ERROR_COPY,
  MIXER_SUBCOMMANDS,
  findPool,
  mixerErrorLine,
  poolsForChain,
  truncateHex
} from "./constants";
import {
  bytesToHex,
  createDepositSecrets,
  hexToBytes,
  random31
} from "./commitment";
import {
  buildNoteString,
  decryptMeta,
  encryptPlain,
  ensureUnlocked,
  generateNote,
  loadNotes,
  lockNoteStore,
  parseNoteInput,
  persistNewNote,
  saveNotes,
  isNoteStoreUnlocked,
  unlockNoteStore
} from "./notes";
import {
  ackPrivacyWarn,
  hasAckedPrivacyWarn,
  privacyWarnStorageKey
} from "./privacy";
import {
  buildWithdrawProof,
  circuitsAvailable,
  MIXER_VK_HASH
} from "./proof";
import { isPinnableLog } from "../helpers";
import type { LogEntry } from "../types";
import { isCommandAllowed, helpRowsForMode } from "../mode";

describe("mixer pools registry", () => {
  it("lists mainnet ETH fixed denoms", () => {
    const pools = poolsForChain(1);
    expect(pools.map((p) => p.denomination).sort()).toEqual(
      ["0.1", "1", "10", "100"].sort()
    );
    expect(pools.every((p) => p.token === "ETH")).toBe(true);
  });

  it("findPool by denom and id", () => {
    expect(findPool(1, "0.1")?.id).toBe("eth-0.1");
    expect(findPool(1, "eth-1")?.denomination).toBe("1");
    expect(findPool(1, "nope")).toBeNull();
    expect(findPool(999, "0.1")).toBeNull();
  });

  it("unsupported chain has no pools", () => {
    expect(poolsForChain(8453)).toEqual([]);
  });
});

describe("mixer fail catalog", () => {
  it("maps Soft copy senses", () => {
    expect(MIXER_ERROR_COPY.MIXER_NO_WALLET).toBe("Wallet not connected.");
    expect(MIXER_ERROR_COPY.MIXER_SPENT).toBe("Note already used.");
    expect(MIXER_ERROR_COPY.MIXER_USER_REJECT).toBe("Mixer cancelled.");
    expect(MIXER_ERROR_COPY.MIXER_NEED_RECIPIENT).toMatch(/recipient/i);
    expect(mixerErrorLine("MIXER_BAD_AMOUNT")).toMatch(/denomination/i);
  });

  it("subcommands locked", () => {
    expect([...MIXER_SUBCOMMANDS]).toEqual([
      "pools",
      "deposit",
      "withdraw",
      "status",
      "notes",
      "help"
    ]);
  });
});

describe("pedersen commitment", () => {
  it("CSPRNG 31-byte secrets", () => {
    const a = random31();
    const b = random31();
    expect(a.length).toBe(31);
    expect(b.length).toBe(31);
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
  });

  it("commitment deterministic for fixed secrets", async () => {
    const n = new Uint8Array(31).fill(1);
    const s = new Uint8Array(31).fill(2);
    const a = await createDepositSecrets(n, s);
    const b = await createDepositSecrets(n, s);
    expect(a.commitment).toBe(b.commitment);
    expect(a.nullifierHash).toBe(b.nullifierHash);
    expect(a.commitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(a.nullifierHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(a.commitment).not.toBe(a.nullifierHash);
  });

  it("hex round-trip", () => {
    const u = new Uint8Array([0, 1, 255]);
    expect(hexToBytes(bytesToHex(u))).toEqual(u);
  });
});

describe("encrypted notes", () => {
  const owner = "0xabc0000000000000000000000000000000000001";

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    unlockNoteStore(owner);
  });

  it("generate + encrypt + decrypt round-trip; meta has no secrets", async () => {
    const pool = findPool(1, "0.1")!;
    const { plain, secrets } = await generateNote(pool);
    expect(plain.commitment).toBe(secrets.commitment);
    expect(buildNoteString(pool, secrets.preimage)).toContain("tornado-eth-0.1-1-0x");

    const meta = await persistNewNote(owner, plain);
    expect(meta.id).toMatch(/^n_/);
    expect(JSON.stringify(meta)).not.toContain(plain.nullifierHex);
    expect(JSON.stringify(meta)).not.toContain(plain.secretHex);
    expect(meta.ciphertext).toBeTruthy();

    const dec = await decryptMeta(owner, meta);
    expect(dec.commitment).toBe(plain.commitment);
    expect(dec.nullifierHex).toBe(plain.nullifierHex);

    const listed = loadNotes(owner);
    expect(listed).toHaveLength(1);
    expect(listed[0]!.commitment).toBe(plain.commitment);
  });

  it("wrong key material fails decrypt", async () => {
    const pool = findPool(1, "1")!;
    const { plain } = await generateNote(pool);
    const { ciphertext, iv } = await encryptPlain(owner, plain);
    // wipe key
    localStorage.removeItem(`0xterm_mixer_key_${owner.toLowerCase()}`);
    await expect(
      decryptMeta(owner, {
        id: "x",
        commitment: plain.commitment,
        poolId: plain.poolId,
        chainId: 1,
        denomination: "1",
        token: "ETH",
        createdAt: 0,
        spentLocal: false,
        ciphertext,
        iv
      })
    ).rejects.toBeTruthy();
  });

  it("parseNoteInput accepts portable string; rejects garbage", async () => {
    const pool = findPool(1, "0.1")!;
    const { plain, secrets } = await generateNote(pool);
    const ok = await parseNoteInput(plain.noteString);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.plain.commitment).toBe(secrets.commitment);
    }
    const bad = await parseNoteInput("not-a-note");
    expect(bad.ok).toBe(false);
  });

  it("unlock gate", () => {
    lockNoteStore(owner);
    expect(isNoteStoreUnlocked(owner)).toBe(false);
    unlockNoteStore(owner);
    expect(isNoteStoreUnlocked(owner)).toBe(true);
    ensureUnlocked(owner);
  });
});

describe("privacy warn + proof fail-closed", () => {
  beforeEach(() => localStorage.clear());

  it("acks once per owner key", () => {
    const o = "0xuser";
    expect(hasAckedPrivacyWarn(o)).toBe(false);
    expect(privacyWarnStorageKey(o)).toContain("0xuser");
    ackPrivacyWarn(o);
    expect(hasAckedPrivacyWarn(o)).toBe(true);
  });

  it("withdraw proof fails closed without circuits", async () => {
    expect(circuitsAvailable()).toBe(false);
    expect(MIXER_VK_HASH).toBeNull();
    const res = await buildWithdrawProof({
      root: ("0x" + "0".repeat(64)) as `0x${string}`,
      nullifierHash: ("0x" + "1".repeat(64)) as `0x${string}`,
      recipient: "0x0000000000000000000000000000000000000001",
      relayer: "0x0000000000000000000000000000000000000000",
      fee: 0n,
      refund: 0n,
      nullifier: new Uint8Array(31),
      secret: new Uint8Array(31),
      pathElements: [],
      pathIndices: []
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("MIXER_PROOF_FAIL");
  });
});

describe("mixer mode + pin", () => {
  it("invest OK / forensic blocked", () => {
    expect(isCommandAllowed("invest", "mixer")).toBe(true);
    expect(isCommandAllowed("console", "mixer")).toBe(true);
    expect(isCommandAllowed("forensic", "mixer")).toBe(false);
    expect(isCommandAllowed("dev", "mixer")).toBe(false);
  });

  it("help rows include mixer*", () => {
    const cmds = helpRowsForMode("invest").map((r) => r.command);
    expect(cmds.some((c) => c === "mixer")).toBe(true);
    expect(cmds.some((c) => c.startsWith("mixer pools"))).toBe(true);
    expect(cmds.some((c) => c.startsWith("mixer notes"))).toBe(true);
  });

  it("type mixer is pinnable; component deposit is not via type", () => {
    const log: LogEntry = {
      id: "1",
      type: "mixer",
      payload: { mode: "pools" }
    };
    expect(isPinnableLog(log)).toBe(true);
    const dep: LogEntry = { id: "2", type: "component", title: "MIXER DEPOSIT" };
    expect(isPinnableLog(dep)).toBe(false);
  });

  it("truncate never dumps full hash in short form", () => {
    const h = "0x" + "ab".repeat(32);
    expect(truncateHex(h).length).toBeLessThan(h.length);
    expect(truncateHex(h)).toContain("…");
  });
});

describe("note secrecy in snapshots", () => {
  it("saveNotes store never asserts plaintext secrets fields", () => {
    const owner = "0xsnap";
    saveNotes(owner, [
      {
        id: "n_deadbeef",
        commitment: ("0x" + "ab".repeat(32)) as `0x${string}`,
        poolId: "eth-0.1",
        chainId: 1,
        denomination: "0.1",
        token: "ETH",
        createdAt: 1,
        spentLocal: false,
        ciphertext: "AAAA",
        iv: "BBBB"
      }
    ]);
    const raw = localStorage.getItem(
      `0xterm_mixer_notes_${owner.toLowerCase()}`
    )!;
    expect(raw).not.toMatch(/nullifierHex/);
    expect(raw).not.toMatch(/secretHex/);
    expect(raw).not.toMatch(/"secret"/);
  });
});
