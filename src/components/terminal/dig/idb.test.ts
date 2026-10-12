/** @vitest-environment jsdom */
/**
 * @file idb.test.ts
 * @description Dig IDB isolation from vault + save honesty (#199 QA)
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { DIG_IDB_NAME, DIG_IDB_STORE } from "./constants";
import { VAULT_DB } from "../../../lib/localWallet/types";
import {
  loadDigSource,
  loadDigSourceRecents,
  openDigDb,
  saveDigSource
} from "./idb";

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  await deleteDb(DIG_IDB_NAME);
  await deleteDb(VAULT_DB);
});

describe("dig IDB isolation (#199)", () => {
  it("uses a DB name distinct from vault VAULT_DB", () => {
    expect(DIG_IDB_NAME).toBe("0xterm-dig");
    expect(DIG_IDB_NAME).not.toBe(VAULT_DB);
  });

  it("creates dig store on first open even if vault DB already exists", async () => {
    // Simulate vault opening "0xterm" v1 first (historical clash)
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(VAULT_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("vault")) {
          db.createObjectStore("vault");
        }
      };
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });

    const dig = await openDigDb();
    expect(dig.name).toBe(DIG_IDB_NAME);
    expect(dig.objectStoreNames.contains(DIG_IDB_STORE)).toBe(true);
    dig.close();
  });

  it("saveDigSource returns true and persists source + RECENT", async () => {
    const ok = await saveDigSource("Vault.sol", "contract Vault {}");
    expect(ok).toBe(true);
    const src = await loadDigSource();
    expect(src?.filename).toBe("Vault.sol");
    expect(src?.content).toBe("contract Vault {}");
    const recents = await loadDigSourceRecents();
    expect(recents).toHaveLength(1);
    expect(recents[0]?.filename).toBe("Vault.sol");
  });

  it("RECENT persists across reopen after save", async () => {
    expect(await saveDigSource("A.sol", "a")).toBe(true);
    expect(await saveDigSource("B.sol", "b")).toBe(true);
    const recents = await loadDigSourceRecents();
    expect(recents.map((r) => r.filename)).toEqual(["B.sol", "A.sol"]);
    // Re-open path via load
    const again = await loadDigSourceRecents();
    expect(again.map((r) => r.filename)).toEqual(["B.sol", "A.sol"]);
    expect((await loadDigSource())?.filename).toBe("B.sol");
  });

  it("saveDigSource returns false when IDB store put fails", async () => {
    // Open DB then break by deleting the store mid-flight via corrupt open
    // Force failure: stub openDigDb path by making transaction fail —
    // simplest: remove indexedDB temporarily after ensuring name is correct.
    const saved = globalThis.indexedDB;
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      get: () => undefined
    });
    try {
      const ok = await saveDigSource("X.sol", "x");
      expect(ok).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        get: () => saved
      });
    }
  });
});
