/**
 * @file vault.ts
 * @description Local vault lifecycle: create/import/unlock/lock/idle/pagehide (#29).
 *   RAM-only unlocked state. Never puts secrets in localStorage.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist as english } from "@scure/bip39/wordlists/english";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import type { Address, LocalAccount } from "viem";
import { decryptVault, encryptVault, encryptWithKey } from "./crypto";
import { deleteEnvelope, loadEnvelope, saveEnvelope } from "./idb";
import {
  DEFAULT_TIMEOUT_MINUTES,
  IDLE_TICK_MS,
  MAX_TIMEOUT_MINUTES,
  MIN_PASSWORD_LENGTH,
  MIN_TIMEOUT_MINUTES,
  PATH_PREFIX,
  SIGNER_PREF_KEY,
  UNLOCK_FAIL_MAX,
  UNLOCK_FAIL_WINDOW_MS,
  WALLET_CHANNEL,
  type SignerPref,
  type UnlockedVault,
  type VaultEnvelopeV1,
  type VaultPlaintextV1,
  type VaultSource,
  WalletError
} from "./types";

let unlocked: UnlockedVault | null = null;
let idleTimer: ReturnType<typeof setInterval> | null = null;
let activityBound = false;
let pagehideBound = false;
let channel: BroadcastChannel | null = null;
let unlockFailTimes: number[] = [];
const listeners = new Set<() => void>();

let nowFn: () => number = () => Date.now();

export function _setNowForTests(fn: (() => number) | null) {
  nowFn = fn ?? (() => Date.now());
}

export function _resetVaultForTests() {
  wipeRam();
  stopIdleTimer();
  unlockFailTimes = [];
  listeners.clear();
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", onActivity);
    window.removeEventListener("pointerdown", onActivity);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("beforeunload", onPageHide);
  }
  activityBound = false;
  pagehideBound = false;
  if (channel) {
    try {
      channel.close();
    } catch {
      /* ignore */
    }
    channel = null;
  }
}

export function subscribeVault(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* ignore */
    }
  }
}

function wipeRam() {
  unlocked = null;
  notify();
}

function onActivity() {
  if (unlocked) unlocked.lastActivityAt = nowFn();
}

function onPageHide() {
  wipeRam();
  broadcast("lock");
}

function ensureListeners() {
  if (typeof window === "undefined") return;
  if (!activityBound) {
    window.addEventListener("keydown", onActivity);
    window.addEventListener("pointerdown", onActivity);
    activityBound = true;
  }
  if (!pagehideBound) {
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    pagehideBound = true;
  }
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(WALLET_CHANNEL);
    channel.onmessage = (ev) => {
      if (ev?.data?.type === "lock") wipeRam();
    };
  }
}

function broadcast(type: "lock") {
  try {
    channel?.postMessage({ type });
  } catch {
    /* ignore */
  }
}

function startIdleTimer() {
  stopIdleTimer();
  if (typeof window === "undefined") return;
  idleTimer = setInterval(() => {
    if (!unlocked) return;
    const timeoutMs = unlocked.plaintext.timeoutMinutes * 60_000;
    if (nowFn() - unlocked.lastActivityAt >= timeoutMs) lockVault();
  }, IDLE_TICK_MS);
}

function stopIdleTimer() {
  if (idleTimer != null) {
    clearInterval(idleTimer);
    idleTimer = null;
  }
}

function buildAccounts(
  plaintext: VaultPlaintextV1,
  source: VaultSource
): LocalAccount[] {
  if (source === "imported-pk" || plaintext.privateKey) {
    if (!plaintext.privateKey) throw new WalletError("WALLET_BAD_PK");
    return [privateKeyToAccount(plaintext.privateKey)];
  }
  if (!plaintext.mnemonic) throw new WalletError("WALLET_BAD_MNEMONIC");
  const accounts: LocalAccount[] = [];
  for (let i = 0; i < plaintext.accountCount; i++) {
    accounts.push(
      mnemonicToAccount(plaintext.mnemonic, {
        addressIndex: i,
        passphrase: plaintext.passphrase || undefined
      })
    );
  }
  return accounts;
}

function checkUnlockRateLimit() {
  const now = nowFn();
  unlockFailTimes = unlockFailTimes.filter(
    (t) => now - t < UNLOCK_FAIL_WINDOW_MS
  );
  if (unlockFailTimes.length >= UNLOCK_FAIL_MAX) {
    throw new WalletError("WALLET_RATE_LIMIT");
  }
}

function recordUnlockFail() {
  unlockFailTimes.push(nowFn());
}

async function persistRam(): Promise<void> {
  if (!unlocked) return;
  const envelope = await encryptWithKey(unlocked.plaintext, unlocked.cryptoKey, {
    source: unlocked.source,
    addresses: unlocked.accounts.map((a) => a.address),
    createdAt: unlocked.createdAt,
    saltB64: unlocked.saltB64
  });
  await saveEnvelope(envelope);
}

export function getUnlocked(): UnlockedVault | null {
  return unlocked;
}

export function isUnlocked(): boolean {
  return unlocked != null;
}

export async function hasVault(): Promise<boolean> {
  return (await loadEnvelope()) != null;
}

export async function getEnvelope(): Promise<VaultEnvelopeV1 | null> {
  return loadEnvelope();
}

export function getSignerPref(): SignerPref | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(SIGNER_PREF_KEY);
  if (v === "local" || v === "injected") return v;
  return null;
}

export function setSignerPref(pref: SignerPref): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SIGNER_PREF_KEY, pref);
  notify();
}

export function deriveAddresses(
  mnemonic: string,
  count: number,
  passphrase?: string
): Address[] {
  const out: Address[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      mnemonicToAccount(mnemonic, {
        addressIndex: i,
        passphrase: passphrase || undefined
      }).address
    );
  }
  return out;
}

export function generateSeed(words: 12 | 24 = 12): string {
  return generateMnemonic(english, words === 24 ? 256 : 128);
}

export function assertValidMnemonic(mnemonic: string): string {
  const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
  const parts = normalized.split(" ");
  if (
    (parts.length !== 12 && parts.length !== 24) ||
    !validateMnemonic(normalized, english)
  ) {
    throw new WalletError("WALLET_BAD_MNEMONIC");
  }
  return normalized;
}

export function assertValidPrivateKey(raw: string): `0x${string}` {
  const hex = raw.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new WalletError("WALLET_BAD_PK");
  return `0x${hex}`;
}

export function assertPasswordPair(a: string, b: string): void {
  if (a.length < MIN_PASSWORD_LENGTH) throw new WalletError("WALLET_PW_SHORT");
  if (a !== b) throw new WalletError("WALLET_PW_MISMATCH");
}

function setUnlockedState(opts: {
  plaintext: VaultPlaintextV1;
  source: VaultSource;
  selectedIndex: number;
  key: CryptoKey;
  saltB64: string;
  createdAt: string;
}) {
  ensureListeners();
  const accounts = buildAccounts(opts.plaintext, opts.source);
  const now = nowFn();
  unlocked = {
    plaintext: opts.plaintext,
    accounts,
    selectedIndex: Math.min(opts.selectedIndex, accounts.length - 1),
    unlockedAt: now,
    lastActivityAt: now,
    cryptoKey: opts.key,
    saltB64: opts.saltB64,
    source: opts.source,
    createdAt: opts.createdAt
  };
  startIdleTimer();
  notify();
}

export async function createVault(opts: {
  mnemonic: string;
  password: string;
  passwordConfirm: string;
  passphrase?: string;
}): Promise<{ address: Address; envelope: VaultEnvelopeV1 }> {
  if (await hasVault()) throw new WalletError("WALLET_EXISTS");
  assertPasswordPair(opts.password, opts.passwordConfirm);
  const mnemonic = assertValidMnemonic(opts.mnemonic);
  const plaintext: VaultPlaintextV1 = {
    mnemonic,
    ...(opts.passphrase ? { passphrase: opts.passphrase } : {}),
    accountCount: 1,
    requirePasswordPerTx: false,
    timeoutMinutes: DEFAULT_TIMEOUT_MINUTES
  };
  const addresses = deriveAddresses(mnemonic, 1, opts.passphrase);
  const { envelope, key } = await encryptVault(plaintext, opts.password, {
    source: "created",
    addresses
  });
  await saveEnvelope(envelope);
  setUnlockedState({
    plaintext,
    source: "created",
    selectedIndex: 0,
    key,
    saltB64: envelope.saltB64,
    createdAt: envelope.createdAt
  });
  setSignerPref("local");
  return { address: addresses[0]!, envelope };
}

export async function importVault(opts: {
  secret: string;
  password: string;
  passwordConfirm: string;
  passphrase?: string;
  replace?: boolean;
}): Promise<{ address: Address; source: VaultSource }> {
  if ((await hasVault()) && !opts.replace) {
    throw new WalletError("WALLET_EXISTS");
  }
  assertPasswordPair(opts.password, opts.passwordConfirm);
  const trimmed = opts.secret.trim();
  let plaintext: VaultPlaintextV1;
  let source: VaultSource;
  let addresses: Address[];

  const looksPk =
    /^(0x)?[0-9a-fA-F]{64}$/.test(trimmed) && !/\s/.test(trimmed);

  if (looksPk) {
    const pk = assertValidPrivateKey(trimmed);
    const account = privateKeyToAccount(pk);
    plaintext = {
      privateKey: pk,
      accountCount: 1,
      requirePasswordPerTx: false,
      timeoutMinutes: DEFAULT_TIMEOUT_MINUTES
    };
    source = "imported-pk";
    addresses = [account.address];
  } else {
    const mnemonic = assertValidMnemonic(trimmed);
    plaintext = {
      mnemonic,
      ...(opts.passphrase ? { passphrase: opts.passphrase } : {}),
      accountCount: 1,
      requirePasswordPerTx: false,
      timeoutMinutes: DEFAULT_TIMEOUT_MINUTES
    };
    source = "imported-mnemonic";
    addresses = deriveAddresses(mnemonic, 1, opts.passphrase);
  }

  const { envelope, key } = await encryptVault(plaintext, opts.password, {
    source,
    addresses
  });
  await saveEnvelope(envelope);
  setUnlockedState({
    plaintext,
    source,
    selectedIndex: 0,
    key,
    saltB64: envelope.saltB64,
    createdAt: envelope.createdAt
  });
  setSignerPref("local");
  return { address: addresses[0]!, source };
}

export async function unlockVault(password: string): Promise<Address> {
  checkUnlockRateLimit();
  if (unlocked) throw new WalletError("WALLET_UNLOCKED");
  const envelope = await loadEnvelope();
  if (!envelope) throw new WalletError("WALLET_NONE");
  try {
    const { plaintext, key } = await decryptVault(envelope, password);
    // Prefer envelope.accountCount if ciphertext lagged (should not after persistRam)
    if (envelope.accountCount > plaintext.accountCount && plaintext.mnemonic) {
      plaintext.accountCount = envelope.accountCount;
    }
    setUnlockedState({
      plaintext,
      source: envelope.source,
      selectedIndex: 0,
      key,
      saltB64: envelope.saltB64,
      createdAt: envelope.createdAt
    });
    unlockFailTimes = [];
    setSignerPref("local");
    return unlocked!.accounts[0]!.address;
  } catch (err) {
    recordUnlockFail();
    if (err instanceof WalletError) throw err;
    throw new WalletError("WALLET_BAD_PASSWORD");
  }
}

export function lockVault(): void {
  wipeRam();
  stopIdleTimer();
  broadcast("lock");
}

export async function nukeVault(): Promise<void> {
  lockVault();
  await deleteEnvelope();
  if (typeof localStorage !== "undefined") {
    const pref = localStorage.getItem(SIGNER_PREF_KEY);
    if (pref === "local") localStorage.removeItem(SIGNER_PREF_KEY);
  }
  notify();
}

export function selectAccount(index: number): Address {
  if (!unlocked) throw new WalletError("WALLET_LOCKED");
  if (index < 0 || index >= unlocked.accounts.length) {
    throw new WalletError("WALLET_BAD_INDEX");
  }
  unlocked.selectedIndex = index;
  unlocked.lastActivityAt = nowFn();
  notify();
  return unlocked.accounts[index]!.address;
}

export async function addAccount(): Promise<Address> {
  if (!unlocked) throw new WalletError("WALLET_LOCKED");
  if (!unlocked.plaintext.mnemonic) throw new WalletError("WALLET_NO_HD");
  const nextIndex = unlocked.plaintext.accountCount;
  unlocked.plaintext.accountCount = nextIndex + 1;
  const account = mnemonicToAccount(unlocked.plaintext.mnemonic, {
    addressIndex: nextIndex,
    passphrase: unlocked.plaintext.passphrase || undefined
  });
  unlocked.accounts.push(account);
  unlocked.selectedIndex = nextIndex;
  unlocked.lastActivityAt = nowFn();
  await persistRam();
  notify();
  return account.address;
}

export async function updateVaultPrefs(opts: {
  timeoutMinutes?: number;
  requirePasswordPerTx?: boolean;
}): Promise<void> {
  if (!unlocked) throw new WalletError("WALLET_LOCKED");
  if (opts.timeoutMinutes != null) {
    const t = Math.floor(opts.timeoutMinutes);
    if (t < MIN_TIMEOUT_MINUTES || t > MAX_TIMEOUT_MINUTES) {
      throw new Error(
        `timeout must be ${MIN_TIMEOUT_MINUTES}–${MAX_TIMEOUT_MINUTES} minutes.`
      );
    }
    unlocked.plaintext.timeoutMinutes = t;
  }
  if (opts.requirePasswordPerTx != null) {
    unlocked.plaintext.requirePasswordPerTx = opts.requirePasswordPerTx;
  }
  unlocked.lastActivityAt = nowFn();
  await persistRam();
  notify();
}

export function getSelectedAccount(): LocalAccount | null {
  if (!unlocked) return null;
  return unlocked.accounts[unlocked.selectedIndex] ?? null;
}

export function getSelectedAddress(): Address | null {
  return getSelectedAccount()?.address ?? null;
}

export function accountPath(index: number): string {
  return `${PATH_PREFIX}/${index}`;
}

export function idleRemainingMs(): number | null {
  if (!unlocked) return null;
  const timeoutMs = unlocked.plaintext.timeoutMinutes * 60_000;
  return Math.max(0, timeoutMs - (nowFn() - unlocked.lastActivityAt));
}

export function touchActivity(): void {
  onActivity();
}

export function _firePageHideForTests() {
  onPageHide();
}

export function _tickIdleForTests() {
  if (!unlocked) return;
  const timeoutMs = unlocked.plaintext.timeoutMinutes * 60_000;
  if (nowFn() - unlocked.lastActivityAt >= timeoutMs) lockVault();
}

/** Re-verify password (export / nuke / require-password-per-tx). */
export async function verifyPassword(password: string): Promise<boolean> {
  const envelope = await loadEnvelope();
  if (!envelope) throw new WalletError("WALLET_NONE");
  try {
    await decryptVault(envelope, password);
    return true;
  } catch {
    return false;
  }
}
