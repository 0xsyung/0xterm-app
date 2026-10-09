/**
 * @file crypto.ts
 * @description scrypt KDF + AES-GCM encrypt/decrypt for the local vault (#29).
 *   Reuses the same WebCrypto AES-GCM primitive as chatCrypto.ts.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { scryptAsync } from "@noble/hashes/scrypt";
import {
  KDF_PARAMS,
  type VaultEnvelopeV1,
  type VaultPlaintextV1,
  type VaultSource,
  PATH_PREFIX,
  WalletError
} from "./types";

/** Production KDF; tests may lower N via `_setKdfParamsForTests`. */
type KdfParams = { N: number; r: number; p: number; dkLen: number };
let activeKdf: KdfParams = { ...KDF_PARAMS };

export function _setKdfParamsForTests(params: Partial<KdfParams> | null) {
  activeKdf = params ? { ...KDF_PARAMS, ...params } : { ...KDF_PARAMS };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

export function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function deriveAesKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const pw = new TextEncoder().encode(password);
  const raw = await scryptAsync(pw, salt, { ...activeKdf });
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(raw),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt plaintext with an already-derived AES key (RAM unlock path). */
export async function encryptWithKey(
  plaintext: VaultPlaintextV1,
  key: CryptoKey,
  meta: {
    source: VaultSource;
    addresses: `0x${string}`[];
    createdAt?: string;
    saltB64: string;
  }
): Promise<VaultEnvelopeV1> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = new TextEncoder().encode(JSON.stringify(plaintext));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      pt
    )
  );
  return {
    version: 1,
    cipher: "AES-GCM",
    kdf: "scrypt",
    kdfParams: { ...activeKdf } as typeof KDF_PARAMS,
    saltB64: meta.saltB64,
    ivB64: bytesToB64(iv),
    ciphertextB64: bytesToB64(ct),
    source: meta.source,
    createdAt: meta.createdAt ?? new Date().toISOString(),
    accountCount: plaintext.accountCount,
    addresses: meta.addresses,
    pathPrefix: PATH_PREFIX
  };
}

/** Encrypt plaintext vault JSON into a V1 envelope (ciphertext only is secret). */
export async function encryptVault(
  plaintext: VaultPlaintextV1,
  password: string,
  meta: {
    source: VaultSource;
    addresses: `0x${string}`[];
    createdAt?: string;
  }
): Promise<{ envelope: VaultEnvelopeV1; key: CryptoKey }> {
  if (password.length < 8) throw new WalletError("WALLET_PW_SHORT");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey(password, salt);
  const envelope = await encryptWithKey(plaintext, key, {
    ...meta,
    saltB64: bytesToB64(salt)
  });
  return { envelope, key };
}

/** Decrypt a V1 envelope. Wrong password → WALLET_BAD_PASSWORD (no KDF leak). */
export async function decryptVault(
  envelope: VaultEnvelopeV1,
  password: string
): Promise<{ plaintext: VaultPlaintextV1; key: CryptoKey }> {
  try {
    const salt = b64ToBytes(envelope.saltB64);
    const iv = b64ToBytes(envelope.ivB64);
    const ct = b64ToBytes(envelope.ciphertextB64);
    const key = await deriveAesKey(password, salt);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ct)
    );
    const parsed = JSON.parse(new TextDecoder().decode(pt)) as VaultPlaintextV1;
    if (
      typeof parsed.accountCount !== "number" ||
      typeof parsed.requirePasswordPerTx !== "boolean" ||
      typeof parsed.timeoutMinutes !== "number"
    ) {
      throw new WalletError("WALLET_BAD_PASSWORD");
    }
    return { plaintext: parsed, key };
  } catch (err) {
    if (err instanceof WalletError) throw err;
    throw new WalletError("WALLET_BAD_PASSWORD");
  }
}

/** Password strength: 0–3 bars from length + charset only (no phone-home). */
export function passwordStrengthBars(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  const classes =
    (/[a-z]/.test(password) ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  if (classes >= 3) score++;
  return Math.min(3, score) as 0 | 1 | 2 | 3;
}
