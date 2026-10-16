/**
 * @file groupChatCrypto.ts
 * @description Per-group envelope crypto for on-chain group chat (#77).
 *              Members share a 32-byte group secret (local + owner-wrapped
 *              envelopes on-chain). Messages use AES-GCM with that secret.
 *              Membership / alive() gates decrypt in the client.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address } from "viem";
import {
  KEY_MESSAGE,
  bytesToHex,
  decryptMessage,
  deriveAesKey,
  deriveKeysFromSignature,
  encryptMessage,
  hexToBytes,
  type ChatKeyPair,
  type EncryptedPayload
} from "./chatCrypto";

/** Domain for per-group keypair derivation (distinct from 1:1 KEY_MESSAGE). */
export const GROUP_KEY_MESSAGE = "0xterm.chat.group.v1";

/** Message the wallet signs to derive the group messaging key for `group`. */
export function groupKeySignMessage(group: Address): string {
  return `${GROUP_KEY_MESSAGE}:${group.toLowerCase()}`;
}

/** Derive the deterministic group key pair from a wallet signature. */
export async function deriveGroupKeyPair(signature: string): Promise<ChatKeyPair> {
  return deriveKeysFromSignature(signature);
}

/** AES-GCM key from the shared 32-byte group secret. */
export async function deriveGroupAesKey(secret: Uint8Array): Promise<CryptoKey> {
  if (secret.length !== 32) throw new Error("group secret must be 32 bytes");
  const domain = new TextEncoder().encode(GROUP_KEY_MESSAGE);
  const buf = new Uint8Array(domain.length + secret.length);
  buf.set(domain, 0);
  buf.set(secret, domain.length);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return crypto.subtle.importKey("raw", h, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt"
  ]);
}

export function generateGroupSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function encryptGroupMessage(
  secret: Uint8Array,
  plaintext: string
): Promise<EncryptedPayload> {
  const key = await deriveGroupAesKey(secret);
  return encryptMessage(key, plaintext);
}

export async function decryptGroupMessage(
  secret: Uint8Array,
  payload: EncryptedPayload
): Promise<string> {
  const key = await deriveGroupAesKey(secret);
  return decryptMessage(key, payload);
}

/**
 * Wrap the group secret to a member's registered public key via ECDH
 * (same primitive as 1:1 chat). Returns iv‖ciphertext hex for setEnvelope.
 */
export async function wrapGroupSecret(
  secret: Uint8Array,
  myPrivateKey: bigint,
  myPublicKey: Uint8Array,
  peerPublicKey: Uint8Array
): Promise<`0x${string}`> {
  const aes = await deriveAesKey(myPrivateKey, peerPublicKey, myPublicKey);
  const { iv, ciphertext } = await encryptMessage(aes, bytesToHex(secret));
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.length);
  return bytesToHex(packed);
}

/** Unwrap an on-chain envelope blob back to the 32-byte group secret. */
export async function unwrapGroupSecret(
  wrapped: `0x${string}` | Uint8Array,
  myPrivateKey: bigint,
  myPublicKey: Uint8Array,
  peerPublicKey: Uint8Array
): Promise<Uint8Array> {
  const bytes = typeof wrapped === "string" ? hexToBytes(wrapped) : wrapped;
  if (bytes.length < 13) throw new Error("envelope too short");
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const aes = await deriveAesKey(myPrivateKey, peerPublicKey, myPublicKey);
  const hex = await decryptMessage(aes, { iv, ciphertext });
  const secret = hexToBytes(hex);
  if (secret.length !== 32) throw new Error("bad unwrapped secret");
  return secret;
}

/** Re-export 1:1 domain for tests that assert distinction. */
export { KEY_MESSAGE };
