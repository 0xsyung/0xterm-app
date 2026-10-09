/**
 * @file userPrefs.test.ts
 * @description Anon prefs persist + migrate-on-connect (#181)
 */
import { describe, expect, it } from "vitest";
import {
  SAFE_ANON_PREF_KEYS,
  USER_PREFS_ANON_KEY,
  isSafeAnonPrefKey,
  migrateAnonPrefsOnConnect,
  pickSafeAnonPrefs,
  readUserPrefsBlob,
  userPrefsWalletKey,
  writeUserPref
} from "./userPrefs";

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    store,
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    }
  };
}

const ADDR = "0xabcDEF0000000000000000000000000000000001";
const SEPOLIA = 11155111;

describe("safe anon key gate", () => {
  it("allows UI prefs and rejects secrets / wallet-bound keys", () => {
    for (const k of SAFE_ANON_PREF_KEYS) {
      expect(isSafeAnonPrefKey(k)).toBe(true);
    }
    expect(isSafeAnonPrefKey("rpcProviders")).toBe(false);
    expect(isSafeAnonPrefKey("explorerKeys")).toBe(false);
    expect(isSafeAnonPrefKey("logs")).toBe(false);
    expect(isSafeAnonPrefKey("history")).toBe(false);
    expect(isSafeAnonPrefKey("pinned")).toBe(false);
    expect(isSafeAnonPrefKey("bindings")).toBe(false);
    expect(isSafeAnonPrefKey("portfolioSnapshot")).toBe(false);
    expect(isSafeAnonPrefKey("hlBuilderFeeBp")).toBe(true);
  });

  it("pickSafeAnonPrefs strips unsafe keys", () => {
    expect(
      pickSafeAnonPrefs({
        chainId: SEPOLIA,
        rpcProviders: { 1: { alchemy: "https://x" } },
        theme: "teletype"
      })
    ).toEqual({ chainId: SEPOLIA, theme: "teletype" });
  });
});

describe("#181 acceptance: anon network survives reload", () => {
  it("writes chainId to anon when disconnected and reads it back", () => {
    const storage = memoryStorage();
    writeUserPref(storage, null, "chainId", SEPOLIA);
    writeUserPref(storage, null, "dexId", "univ3");
    expect(storage.store[USER_PREFS_ANON_KEY]).toBeTruthy();
    const anon = readUserPrefsBlob(storage, null);
    expect(anon.chainId).toBe(SEPOLIA);
    expect(anon.dexId).toBe("univ3");
    // reload = fresh read
    expect(readUserPrefsBlob(storage, null).chainId).toBe(SEPOLIA);
  });

  it("no-ops unsafe keys without a wallet", () => {
    const storage = memoryStorage();
    writeUserPref(storage, null, "rpcProviders", { 1: { x: "y" } });
    writeUserPref(storage, null, "logs", [{ id: "1" }]);
    expect(storage.store[USER_PREFS_ANON_KEY]).toBeUndefined();
  });

  it("writes any key to the wallet blob when connected", () => {
    const storage = memoryStorage();
    writeUserPref(storage, ADDR, "chainId", SEPOLIA);
    writeUserPref(storage, ADDR, "logs", [{ id: "1" }]);
    const key = userPrefsWalletKey(ADDR);
    const blob = JSON.parse(storage.store[key]!);
    expect(blob.chainId).toBe(SEPOLIA);
    expect(blob.logs).toEqual([{ id: "1" }]);
    expect(storage.store[USER_PREFS_ANON_KEY]).toBeUndefined();
  });
});

describe("#181 acceptance: migrate anon → wallet on connect", () => {
  it("wallet with no saved prefs adopts anon chainId (and other safe keys)", () => {
    const storage = memoryStorage();
    writeUserPref(storage, null, "chainId", SEPOLIA);
    writeUserPref(storage, null, "dexId", "univ3");
    writeUserPref(storage, null, "theme", "teletype");
    writeUserPref(storage, null, "actionNetworks", { swap: 1 });

    const migrated = migrateAnonPrefsOnConnect(storage, ADDR);
    expect(migrated.chainId).toBe(SEPOLIA);
    expect(migrated.dexId).toBe("univ3");
    expect(migrated.theme).toBe("teletype");
    expect(migrated.actionNetworks).toEqual({ swap: 1 });

    const wallet = readUserPrefsBlob(storage, ADDR);
    expect(wallet.chainId).toBe(SEPOLIA);
    expect(wallet.dexId).toBe("univ3");
  });

  it("wallet with saved prefs keeps its own (does not overwrite with anon)", () => {
    const storage = memoryStorage();
    writeUserPref(storage, ADDR, "chainId", 1);
    writeUserPref(storage, ADDR, "dexId", "univ3");
    writeUserPref(storage, null, "chainId", SEPOLIA);
    writeUserPref(storage, null, "dexId", "other");
    writeUserPref(storage, null, "theme", "teletype");

    const migrated = migrateAnonPrefsOnConnect(storage, ADDR);
    expect(migrated.chainId).toBe(1);
    expect(migrated.dexId).toBe("univ3");
    // theme was missing on wallet → adopted from anon
    expect(migrated.theme).toBe("teletype");

    // second connect still keeps wallet chainId
    writeUserPref(storage, null, "chainId", 8453);
    const again = migrateAnonPrefsOnConnect(storage, ADDR);
    expect(again.chainId).toBe(1);
  });

  it("explicit null on wallet counts as saved (not overwritten by anon)", () => {
    const storage = memoryStorage();
    writeUserPref(storage, ADDR, "chainId", null);
    writeUserPref(storage, null, "chainId", SEPOLIA);
    const migrated = migrateAnonPrefsOnConnect(storage, ADDR);
    expect(migrated.chainId).toBeNull();
  });

  it("adopts anon chainId when wallet blob only has unrelated keys (e.g. ticker)", () => {
    const storage = memoryStorage();
    const key = userPrefsWalletKey(ADDR);
    storage.setItem(
      key,
      JSON.stringify({ ticker: { symbols: ["ETH"], rows: {} } })
    );
    writeUserPref(storage, null, "chainId", SEPOLIA);
    const migrated = migrateAnonPrefsOnConnect(storage, ADDR);
    expect(migrated.chainId).toBe(SEPOLIA);
    expect(migrated.ticker).toEqual({ symbols: ["ETH"], rows: {} });
  });

  it("no-ops when anon is empty", () => {
    const storage = memoryStorage();
    const migrated = migrateAnonPrefsOnConnect(storage, ADDR);
    expect(migrated).toEqual({});
    expect(storage.store[userPrefsWalletKey(ADDR)]).toBeUndefined();
  });
});

describe("corrupt storage resilience", () => {
  it("returns {} and does not throw on bad JSON", () => {
    const storage = memoryStorage({
      [USER_PREFS_ANON_KEY]: "{not-json",
      [userPrefsWalletKey(ADDR)]: "{also-bad"
    });
    expect(readUserPrefsBlob(storage, null)).toEqual({});
    expect(readUserPrefsBlob(storage, ADDR)).toEqual({});
    expect(() =>
      writeUserPref(storage, null, "chainId", SEPOLIA)
    ).not.toThrow();
    expect(() => migrateAnonPrefsOnConnect(storage, ADDR)).not.toThrow();
  });
});

describe("storage throw paths", () => {
  it("read/write/migrate swallow storage exceptions", () => {
    const boom = () => {
      throw new Error("quota");
    };
    const storage = {
      getItem: boom,
      setItem: boom
    };
    expect(readUserPrefsBlob(storage, null)).toEqual({});
    expect(readUserPrefsBlob(storage, ADDR)).toEqual({});
    expect(() => writeUserPref(storage, null, "chainId", SEPOLIA)).not.toThrow();
    expect(() => writeUserPref(storage, ADDR, "chainId", SEPOLIA)).not.toThrow();
    expect(migrateAnonPrefsOnConnect(storage, ADDR)).toEqual({});
  });

  it("migrate catch returns parse of wallet when setItem throws mid-flight", () => {
    const store: Record<string, string> = {
      [USER_PREFS_ANON_KEY]: JSON.stringify({ chainId: SEPOLIA })
    };
    const storage = {
      getItem: (k: string) => (k in store ? store[k]! : null),
      setItem: (_k: string, _v: string) => {
        throw new Error("quota");
      }
    };
    // changed=true then setItem throws → catch returns parseBlob(getItem)
    expect(migrateAnonPrefsOnConnect(storage, ADDR)).toEqual({});
  });
});
