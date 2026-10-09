/**
 * @file userPrefs.ts
 * @description Anon + per-wallet user preference blobs — save/load/migrate (#181)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

/**
 * Wallet-independent prefs mirror (same idea as `TICKER_ANON_KEY`).
 * Only {@link SAFE_ANON_PREF_KEYS} are written here — no RPC/explorer secrets,
 * scrollback, pins, or other wallet-bound data.
 */
export const USER_PREFS_ANON_KEY = "0xterm_prefs_anon";

export const userPrefsWalletKey = (address: string): string =>
  `0xterm_user_${address.toLowerCase()}`;

/**
 * UI prefs safe to keep without a connected wallet.
 * Excludes secrets (rpcProviders, explorerKeys), wallet-bound scrollback
 * (logs/history/pinned/portfolioSnapshot/bindings), and custom tokens.
 */
export const SAFE_ANON_PREF_KEYS = [
  "chainId",
  "dexId",
  "theme",
  "mode",
  "actionNetworks",
  "news"
] as const;

export type SafeAnonPrefKey = (typeof SAFE_ANON_PREF_KEYS)[number];

const SAFE_ANON_SET = new Set<string>(SAFE_ANON_PREF_KEYS);

export function isSafeAnonPrefKey(key: string): key is SafeAnonPrefKey {
  return SAFE_ANON_SET.has(key);
}

export type PrefsStorage = Pick<Storage, "getItem" | "setItem">;

function parseBlob(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Read the wallet prefs blob, or the anon blob when `address` is absent. */
export function readUserPrefsBlob(
  storage: PrefsStorage | null | undefined,
  address?: string | null
): Record<string, unknown> {
  try {
    if (address) {
      return parseBlob(storage?.getItem(userPrefsWalletKey(address)) ?? null);
    }
    return parseBlob(storage?.getItem(USER_PREFS_ANON_KEY) ?? null);
  } catch {
    return {};
  }
}

/**
 * Merge one preference into the wallet blob (any key) or, when disconnected,
 * into the anon blob for safe keys only. Unsafe keys no-op without a wallet.
 */
export function writeUserPref(
  storage: PrefsStorage | null | undefined,
  address: string | null | undefined,
  key: string,
  value: unknown
): void {
  try {
    if (address) {
      const storageKey = userPrefsWalletKey(address);
      const blob = parseBlob(storage?.getItem(storageKey) ?? null);
      blob[key] = value;
      storage?.setItem(storageKey, JSON.stringify(blob));
      return;
    }
    if (!isSafeAnonPrefKey(key)) return;
    const blob = parseBlob(storage?.getItem(USER_PREFS_ANON_KEY) ?? null);
    blob[key] = value;
    storage?.setItem(USER_PREFS_ANON_KEY, JSON.stringify(blob));
  } catch {
    // quota / privacy mode
  }
}

/**
 * On connect: copy each safe anon key the wallet does not already own.
 * Never overwrites a wallet key that is present (including explicit `null`).
 * Mirrors {@link migrateAnonTickerOnConnect} (field-level adopt-if-missing).
 */
export function migrateAnonPrefsOnConnect(
  storage: PrefsStorage | null | undefined,
  address: string
): Record<string, unknown> {
  const storageKey = userPrefsWalletKey(address);
  try {
    const wallet = parseBlob(storage?.getItem(storageKey) ?? null);
    const anon = parseBlob(storage?.getItem(USER_PREFS_ANON_KEY) ?? null);
    let changed = false;
    for (const key of SAFE_ANON_PREF_KEYS) {
      if (Object.prototype.hasOwnProperty.call(wallet, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(anon, key)) continue;
      wallet[key] = anon[key];
      changed = true;
    }
    if (changed) {
      storage?.setItem(storageKey, JSON.stringify(wallet));
    }
    return wallet;
  } catch {
    return {};
  }
}

/** Pick only safe keys from a prefs bag (for tests / export helpers). */
export function pickSafeAnonPrefs(
  prefs: Record<string, unknown>
): Partial<Record<SafeAnonPrefKey, unknown>> {
  const out: Partial<Record<SafeAnonPrefKey, unknown>> = {};
  for (const key of SAFE_ANON_PREF_KEYS) {
    if (Object.prototype.hasOwnProperty.call(prefs, key)) {
      out[key] = prefs[key];
    }
  }
  return out;
}
