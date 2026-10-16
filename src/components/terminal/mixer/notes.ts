/**
 * @file notes.ts
 * @description Portable encrypted mixer notes (AES-GCM at rest) — Soft ACK #111
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  bytesToHex,
  createDepositSecrets,
  hexToBytes,
  type DepositSecrets
} from "./commitment";
import type { MixerPool } from "./constants";

export type MixerNotePlain = {
  version: 1;
  nullifierHex: string;
  secretHex: string;
  commitment: `0x${string}`;
  nullifierHash: `0x${string}`;
  poolId: string;
  chainId: number;
  denomination: string;
  token: string;
  noteString: string;
};

/** Public metadata only — never includes secrets / nullifier plaintext. */
export type MixerNoteMeta = {
  id: string;
  commitment: `0x${string}`;
  poolId: string;
  chainId: number;
  denomination: string;
  token: string;
  createdAt: number;
  spentLocal: boolean;
  ciphertext: string;
  iv: string;
};

const STORE_PREFIX = "0xterm_mixer_notes_";
const KEY_PREFIX = "0xterm_mixer_key_";
const UNLOCK_SESSION = "0xterm_mixer_unlocked_";

function storageKey(owner: string): string {
  return `${STORE_PREFIX}${owner.toLowerCase()}`;
}

function keyMaterialKey(owner: string): string {
  return `${KEY_PREFIX}${owner.toLowerCase()}`;
}

function unlockSessionKey(owner: string): string {
  return `${UNLOCK_SESSION}${owner.toLowerCase()}`;
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(
    u8.byteOffset,
    u8.byteOffset + u8.byteLength
  ) as ArrayBuffer;
}

/** Device key material (CSPRNG); never the note secrets themselves. */
export function ensureKeyMaterial(owner: string): Uint8Array {
  const k = keyMaterialKey(owner);
  const existing =
    typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
  if (existing) return hexToBytes(existing);
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(k, bytesToHex(raw));
  }
  return raw;
}

async function importAesKey(material: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(material),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export function isNoteStoreUnlocked(owner: string): boolean {
  try {
    return sessionStorage.getItem(unlockSessionKey(owner)) === "1";
  } catch {
    return true;
  }
}

export function unlockNoteStore(owner: string): void {
  try {
    sessionStorage.setItem(unlockSessionKey(owner), "1");
  } catch {
    /* ignore */
  }
}

export function lockNoteStore(owner: string): void {
  try {
    sessionStorage.removeItem(unlockSessionKey(owner));
  } catch {
    /* ignore */
  }
}

export function ensureUnlocked(owner: string): void {
  if (!isNoteStoreUnlocked(owner)) unlockNoteStore(owner);
}

export function noteIdFromCommitment(commitment: string): string {
  const c = commitment.startsWith("0x") ? commitment.slice(2) : commitment;
  return `n_${c.slice(0, 8)}`;
}

export function buildNoteString(
  pool: MixerPool,
  preimage: Uint8Array
): string {
  return `tornado-${pool.token.toLowerCase()}-${pool.denomination}-${pool.chainId}-0x${bytesToHex(preimage)}`;
}

export async function generateNote(pool: MixerPool): Promise<{
  plain: MixerNotePlain;
  secrets: DepositSecrets;
}> {
  const secrets = await createDepositSecrets();
  const noteString = buildNoteString(pool, secrets.preimage);
  const plain: MixerNotePlain = {
    version: 1,
    nullifierHex: bytesToHex(secrets.nullifier),
    secretHex: bytesToHex(secrets.secret),
    commitment: secrets.commitment,
    nullifierHash: secrets.nullifierHash,
    poolId: pool.id,
    chainId: pool.chainId,
    denomination: pool.denomination,
    token: pool.token,
    noteString
  };
  return { plain, secrets };
}

export async function encryptPlain(
  owner: string,
  plain: MixerNotePlain
): Promise<{ ciphertext: string; iv: string }> {
  const key = await importAesKey(ensureKeyMaterial(owner));
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encoded = new TextEncoder().encode(JSON.stringify(plain));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return { ciphertext: b64(ct), iv: b64(iv) };
}

export async function decryptMeta(
  owner: string,
  meta: MixerNoteMeta
): Promise<MixerNotePlain> {
  const key = await importAesKey(ensureKeyMaterial(owner));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(fromB64(meta.iv)) },
    key,
    toArrayBuffer(fromB64(meta.ciphertext))
  );
  return JSON.parse(new TextDecoder().decode(pt)) as MixerNotePlain;
}

export function loadNotes(owner: string): MixerNoteMeta[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(storageKey(owner));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MixerNoteMeta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotes(owner: string, notes: MixerNoteMeta[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(owner), JSON.stringify(notes));
}

export async function persistNewNote(
  owner: string,
  plain: MixerNotePlain
): Promise<MixerNoteMeta> {
  ensureUnlocked(owner);
  const { ciphertext, iv } = await encryptPlain(owner, plain);
  const meta: MixerNoteMeta = {
    id: noteIdFromCommitment(plain.commitment),
    commitment: plain.commitment,
    poolId: plain.poolId,
    chainId: plain.chainId,
    denomination: plain.denomination,
    token: plain.token,
    createdAt: Date.now(),
    spentLocal: false,
    ciphertext,
    iv
  };
  const all = loadNotes(owner);
  all.unshift(meta);
  saveNotes(owner, all);
  return meta;
}

export function markNoteSpentLocal(owner: string, commitment: string): void {
  const all = loadNotes(owner);
  const c = commitment.toLowerCase();
  for (const n of all) {
    if (n.commitment.toLowerCase() === c) n.spentLocal = true;
  }
  saveNotes(owner, all);
}

/**
 * Parse a portable note string or raw 0x preimage hex.
 * Never logs secrets.
 */
export async function parseNoteInput(
  raw: string
): Promise<
  | { ok: true; plain: MixerNotePlain; secrets: DepositSecrets }
  | { ok: false; code: "MIXER_BAD_NOTE" }
> {
  const s = raw.trim();
  let preimageHex = "";
  let denom = "";
  let token = "eth";
  let netId = 1;

  const m = /^tornado-([a-z0-9]+)-([0-9.]+)-(\d+)-0x([0-9a-fA-F]+)$/i.exec(s);
  if (m) {
    token = m[1]!.toLowerCase();
    denom = m[2]!;
    netId = Number(m[3]);
    preimageHex = m[4]!;
  } else if (/^(0x)?[0-9a-fA-F]{124}$/i.test(s)) {
    preimageHex = s.replace(/^0x/i, "");
  } else {
    return { ok: false, code: "MIXER_BAD_NOTE" };
  }

  if (preimageHex.length !== 124) return { ok: false, code: "MIXER_BAD_NOTE" };
  try {
    const preimage = hexToBytes(preimageHex);
    const nullifier = preimage.slice(0, 31);
    const secret = preimage.slice(31, 62);
    const secrets = await createDepositSecrets(nullifier, secret);
    const plain: MixerNotePlain = {
      version: 1,
      nullifierHex: bytesToHex(nullifier),
      secretHex: bytesToHex(secret),
      commitment: secrets.commitment,
      nullifierHash: secrets.nullifierHash,
      poolId: "",
      chainId: netId,
      denomination: denom,
      token: token.toUpperCase(),
      noteString: s.startsWith("tornado-")
        ? s
        : `tornado-${token}-${denom || "?"}-${netId}-0x${preimageHex}`
    };
    return { ok: true, plain, secrets };
  } catch {
    return { ok: false, code: "MIXER_BAD_NOTE" };
  }
}
