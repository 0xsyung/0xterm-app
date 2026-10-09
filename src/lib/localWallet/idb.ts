/**
 * @file idb.ts
 * @description IndexedDB envelope persistence for the local vault (#29).
 *   Separate from dig IDB and Hyperliquid agent localStorage.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  VAULT_DB,
  VAULT_KEY,
  VAULT_STORE,
  type VaultEnvelopeV1,
  WalletError
} from "./types";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new WalletError("WALLET_IDB"));
      return;
    }
    const req = indexedDB.open(VAULT_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        db.createObjectStore(VAULT_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new WalletError("WALLET_IDB"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(VAULT_STORE, mode);
      const store = tx.objectStore(VAULT_STORE);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(new WalletError("WALLET_IDB"));
    });
  } finally {
    db.close();
  }
}

export async function loadEnvelope(): Promise<VaultEnvelopeV1 | null> {
  try {
    const v = await withStore<VaultEnvelopeV1 | undefined>("readonly", (store) =>
      store.get(VAULT_KEY)
    );
    return v && v.version === 1 ? v : null;
  } catch (err) {
    if (err instanceof WalletError) throw err;
    throw new WalletError("WALLET_IDB");
  }
}

export async function saveEnvelope(envelope: VaultEnvelopeV1): Promise<void> {
  try {
    await withStore<IDBValidKey>("readwrite", (store) =>
      store.put(envelope, VAULT_KEY)
    );
  } catch (err) {
    if (err instanceof WalletError) throw err;
    throw new WalletError("WALLET_IDB");
  }
}

export async function deleteEnvelope(): Promise<void> {
  try {
    await withStore<undefined>("readwrite", (store) => store.delete(VAULT_KEY));
  } catch (err) {
    if (err instanceof WalletError) throw err;
    throw new WalletError("WALLET_IDB");
  }
}

/** True when the top-level envelope JSON has no secret keys (lock-screen safe). */
export function envelopeHasNoSecrets(envelope: VaultEnvelopeV1): boolean {
  const top = envelope as unknown as Record<string, unknown>;
  return (
    !("mnemonic" in top) &&
    !("privateKey" in top) &&
    !("passphrase" in top) &&
    !("password" in top)
  );
}
