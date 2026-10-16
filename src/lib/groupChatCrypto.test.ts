/**
 * @file groupChatCrypto.test.ts
 * @description Unit tests for group envelope crypto (#77).
 */
import { describe, expect, it } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1";
import {
  GROUP_KEY_MESSAGE,
  decryptGroupMessage,
  deriveGroupAesKey,
  encryptGroupMessage,
  generateGroupSecret,
  groupKeySignMessage,
  unwrapGroupSecret,
  wrapGroupSecret
} from "./groupChatCrypto";
import { KEY_MESSAGE, bytesToHex } from "./chatCrypto";

const key = (): bigint =>
  secp256k1.utils.normPrivateKeyToScalar(secp256k1.utils.randomPrivateKey());
const pubOf = (priv: bigint) => secp256k1.getPublicKey(priv, true);

describe("groupChatCrypto", () => {
  it("uses a domain distinct from 1:1 chat", () => {
    expect(GROUP_KEY_MESSAGE).not.toBe(KEY_MESSAGE);
    expect(groupKeySignMessage("0x1111111111111111111111111111111111111111")).toContain(
      GROUP_KEY_MESSAGE
    );
  });

  it("round-trips encrypt/decrypt with a shared secret", async () => {
    const secret = generateGroupSecret();
    expect(secret.length).toBe(32);
    const { iv, ciphertext } = await encryptGroupMessage(secret, "hello group");
    const pt = await decryptGroupMessage(secret, { iv, ciphertext });
    expect(pt).toBe("hello group");
  });

  it("different secrets produce different AES keys", async () => {
    const a = await deriveGroupAesKey(generateGroupSecret());
    const b = await deriveGroupAesKey(generateGroupSecret());
    const FIXED = new Uint8Array(12);
    const tag = async (k: CryptoKey) => {
      const ct = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: FIXED },
        k,
        new TextEncoder().encode("probe")
      );
      return bytesToHex(new Uint8Array(ct));
    };
    expect(await tag(a)).not.toBe(await tag(b));
  });

  it("wraps and unwraps the group secret to a peer", async () => {
    const secret = generateGroupSecret();
    const aPriv = key();
    const aPub = pubOf(aPriv);
    const bPriv = key();
    const bPub = pubOf(bPriv);
    const wrapped = await wrapGroupSecret(secret, aPriv, aPub, bPub);
    const recovered = await unwrapGroupSecret(wrapped, bPriv, bPub, aPub);
    expect(bytesToHex(recovered)).toBe(bytesToHex(secret));
  });
});
