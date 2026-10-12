/**
 * @file idb.ts
 * @description IndexedDB wrappers for dig workspace (#39/#198/#199 QA)
 * Uses dedicated DB `0xterm-dig` — never share vault `0xterm` (#29 clash).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { DIG_DEFAULT_SOLC_VERSION, DIG_IDB_NAME, DIG_IDB_STORE } from "./constants";
import type { DigContractArtifact } from "./artifact";

export type DigSourceRecord = {
  filename: string;
  content: string;
  updatedAt: number;
};

/** Soft ACK #198 — ≤8 distinct recent buffers (filename + content snapshot). */
export type DigSourceRecent = DigSourceRecord;

export type DigWorkspace = {
  source: DigSourceRecord | null;
  solcVersion: string;
  artifacts: DigContractArtifact[];
  lastSummary: string | null;
};

export const DIG_SOURCE_RECENTS_MAX = 8;

const KEYS = {
  source: "source",
  solcVersion: "solcVersion",
  artifacts: "artifacts",
  lastSummary: "lastSummary",
  sourceRecents: "sourceRecents",
  wasmPrefix: "wasm:"
} as const;

/** Open dig IDB (creates `dig` store on first open of `0xterm-dig`). */
export function openDigDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DIG_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DIG_IDB_STORE)) {
        db.createObjectStore(DIG_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("idb open failed"));
  });
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDigDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(DIG_IDB_STORE, "readonly");
          const store = tx.objectStore(DIG_IDB_STORE);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result as T | undefined);
          req.onerror = () => reject(req.error);
          tx.oncomplete = () => db.close();
        } catch (e) {
          db.close();
          reject(e);
        }
      })
  );
}

function idbSet(key: string, value: unknown): Promise<void> {
  return openDigDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(DIG_IDB_STORE, "readwrite");
          const store = tx.objectStore(DIG_IDB_STORE);
          const req = store.put(value, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
          tx.oncomplete = () => db.close();
          tx.onerror = () => {
            db.close();
            reject(tx.error || new Error("idb tx failed"));
          };
        } catch (e) {
          db.close();
          reject(e);
        }
      })
  );
}

export async function loadDigSource(): Promise<DigSourceRecord | null> {
  try {
    return (await idbGet<DigSourceRecord>(KEYS.source)) ?? null;
  } catch {
    return null;
  }
}

export async function loadDigSourceRecents(): Promise<DigSourceRecent[]> {
  try {
    const list = (await idbGet<DigSourceRecent[]>(KEYS.sourceRecents)) ?? [];
    return Array.isArray(list) ? list.slice(0, DIG_SOURCE_RECENTS_MAX) : [];
  } catch {
    return [];
  }
}

/** Push/update a recent by filename (most-recent first, distinct, ≤8). */
export async function pushDigSourceRecent(
  filename: string,
  content: string
): Promise<DigSourceRecent[]> {
  const rec: DigSourceRecent = {
    filename,
    content,
    updatedAt: Date.now()
  };
  const prev = await loadDigSourceRecents();
  const next = [
    rec,
    ...prev.filter((r) => r.filename.toLowerCase() !== filename.toLowerCase())
  ].slice(0, DIG_SOURCE_RECENTS_MAX);
  await idbSet(KEYS.sourceRecents, next);
  return next;
}

/**
 * Persist working buffer to dig IDB.
 * @returns true on success — callers must not claim `saved · idb` otherwise.
 */
export async function saveDigSource(
  filename: string,
  content: string
): Promise<boolean> {
  const rec: DigSourceRecord = {
    filename,
    content,
    updatedAt: Date.now()
  };
  try {
    await idbSet(KEYS.source, rec);
    await pushDigSourceRecent(filename, content);
    return true;
  } catch {
    return false;
  }
}

export async function loadDigSolcVersion(): Promise<string> {
  try {
    const v = await idbGet<string>(KEYS.solcVersion);
    return v || DIG_DEFAULT_SOLC_VERSION;
  } catch {
    return DIG_DEFAULT_SOLC_VERSION;
  }
}

export async function saveDigSolcVersion(version: string): Promise<void> {
  try {
    await idbSet(KEYS.solcVersion, version);
  } catch {
    /* non-fatal */
  }
}

export async function loadDigArtifacts(): Promise<DigContractArtifact[]> {
  try {
    return (await idbGet<DigContractArtifact[]>(KEYS.artifacts)) ?? [];
  } catch {
    return [];
  }
}

export async function saveDigArtifacts(
  artifacts: DigContractArtifact[]
): Promise<void> {
  try {
    await idbSet(KEYS.artifacts, artifacts);
  } catch {
    /* non-fatal */
  }
}

export async function loadDigLastSummary(): Promise<string | null> {
  try {
    return (await idbGet<string>(KEYS.lastSummary)) ?? null;
  } catch {
    return null;
  }
}

export async function saveDigLastSummary(text: string): Promise<void> {
  try {
    await idbSet(KEYS.lastSummary, text);
  } catch {
    /* non-fatal */
  }
}

export async function loadCachedWasm(version: string): Promise<string | null> {
  try {
    return (await idbGet<string>(KEYS.wasmPrefix + version)) ?? null;
  } catch {
    return null;
  }
}

export async function saveCachedWasm(
  version: string,
  jsText: string
): Promise<void> {
  try {
    await idbSet(KEYS.wasmPrefix + version, jsText);
  } catch {
    /* non-fatal — large blob may exceed quota */
  }
}
