/**
 * @file types.ts
 * @description Local wallet vault types (#29)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address, LocalAccount } from "viem";

export const VAULT_DB = "0xterm";
export const VAULT_STORE = "vault";
export const VAULT_KEY = "primary";
export const SIGNER_PREF_KEY = "0xterm_signer_pref";
export const WALLET_CHANNEL = "0xterm-wallet";
export const PATH_PREFIX = "m/44'/60'/0'/0" as const;
export const DEFAULT_TIMEOUT_MINUTES = 15;
export const MIN_TIMEOUT_MINUTES = 1;
export const MAX_TIMEOUT_MINUTES = 60;
export const MIN_PASSWORD_LENGTH = 8;
export const IDLE_TICK_MS = 30_000;
export const UNLOCK_FAIL_WINDOW_MS = 5 * 60_000;
export const UNLOCK_FAIL_MAX = 5;

export const KDF_PARAMS = {
  N: 131072,
  r: 8,
  p: 1,
  dkLen: 32
} as const;

export type VaultSource = "created" | "imported-mnemonic" | "imported-pk";

/** Success ack after import — source once (avoid "imported imported-mnemonic") (#193). */
export function formatVaultImportAck(
  source: VaultSource,
  shortAddress: string
): string {
  return `[✓] ${source} ${shortAddress}. type wallet lock when you step away.`;
}

export type VaultEnvelopeV1 = {
  version: 1;
  cipher: "AES-GCM";
  kdf: "scrypt";
  kdfParams: typeof KDF_PARAMS;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
  source: VaultSource;
  createdAt: string;
  accountCount: number;
  addresses: Address[];
  pathPrefix: typeof PATH_PREFIX;
};

export type VaultPlaintextV1 = {
  mnemonic?: string;
  passphrase?: string;
  privateKey?: `0x${string}`;
  accountCount: number;
  requirePasswordPerTx: boolean;
  timeoutMinutes: number;
};

export type UnlockedVault = {
  plaintext: VaultPlaintextV1;
  accounts: LocalAccount[];
  selectedIndex: number;
  unlockedAt: number;
  lastActivityAt: number;
  /** AES-GCM key held only while unlocked — enables re-encrypt without password. */
  cryptoKey: CryptoKey;
  saltB64: string;
  source: VaultSource;
  createdAt: string;
};

export type SignerPref = "local" | "injected";

export type WalletErrorCode =
  | "WALLET_NONE"
  | "WALLET_LOCKED"
  | "WALLET_UNLOCKED"
  | "WALLET_EXISTS"
  | "WALLET_BAD_MNEMONIC"
  | "WALLET_BAD_PK"
  | "WALLET_BAD_PASSWORD"
  | "WALLET_PW_MISMATCH"
  | "WALLET_PW_SHORT"
  | "WALLET_CONFIRM_FAIL"
  | "WALLET_IDB"
  | "WALLET_NO_HD"
  | "WALLET_BAD_INDEX"
  | "WALLET_NO_INJECTED"
  | "WALLET_TX_REJECT"
  | "WALLET_SIM_FAIL"
  | "WALLET_CHAIN"
  | "WALLET_NUKE_ABORT"
  | "WALLET_RATE_LIMIT";

export const WALLET_ERROR_MSG: Record<WalletErrorCode, string> = {
  WALLET_NONE: "no local wallet. type wallet create  or  wallet import.",
  WALLET_LOCKED: "wallet is locked. type wallet unlock.",
  WALLET_UNLOCKED: "wallet is already unlocked.",
  WALLET_EXISTS:
    "local wallet already exists. wallet nuke first, or wallet import (replaces).",
  WALLET_BAD_MNEMONIC:
    "that is not a valid BIP-39 mnemonic (need 12 or 24 English words).",
  WALLET_BAD_PK: "that is not a 32-byte private key.",
  WALLET_BAD_PASSWORD: "wrong password.",
  WALLET_PW_MISMATCH: "passwords did not match.",
  WALLET_PW_SHORT: "password must be at least 8 characters.",
  WALLET_CONFIRM_FAIL: "word N did not match. seed was not stored.",
  WALLET_IDB: "this browser blocked IndexedDB. local wallet cannot persist.",
  WALLET_NO_HD:
    "this vault was imported from a private key. HD accounts need a mnemonic.",
  WALLET_BAD_INDEX: "no account N. type wallet accounts.",
  WALLET_NO_INJECTED: "no injected wallet. type connect.",
  WALLET_TX_REJECT: "transaction cancelled.",
  WALLET_SIM_FAIL: "simulation failed.",
  WALLET_CHAIN: "local wallet will not sign a tx for the wrong chain.",
  WALLET_NUKE_ABORT: "nuke cancelled.",
  WALLET_RATE_LIMIT: "too many unlock attempts. try again in a few minutes."
};

export class WalletError extends Error {
  code: WalletErrorCode;
  constructor(code: WalletErrorCode, detail?: string) {
    const base = WALLET_ERROR_MSG[code];
    super(detail ? `${base} ${detail}`.trim() : base);
    this.name = "WalletError";
    this.code = code;
  }
}
