/**
 * @file commitment.ts
 * @description Tornado Classic Pedersen commitment / nullifierHash (circomlibjs)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

type PedersenApi = {
  hash: (data: Uint8Array) => Uint8Array;
};

type BabyJubApi = {
  unpackPoint: (buff: Uint8Array) => [unknown, unknown] | null;
  F: { toObject: (x: unknown) => bigint };
};

let pedersenP: Promise<PedersenApi> | null = null;
let babyP: Promise<BabyJubApi> | null = null;

async function getPedersen(): Promise<PedersenApi> {
  if (!pedersenP) {
    pedersenP = (async () => {
      const mod = (await import("circomlibjs")) as {
        buildPedersenHash: () => Promise<PedersenApi>;
      };
      return mod.buildPedersenHash();
    })();
  }
  return pedersenP;
}

async function getBabyJub(): Promise<BabyJubApi> {
  if (!babyP) {
    babyP = (async () => {
      const mod = (await import("circomlibjs")) as {
        buildBabyjub: () => Promise<BabyJubApi>;
      };
      return mod.buildBabyjub();
    })();
  }
  return babyP;
}

/** 31 random bytes via CSPRNG (Tornado Classic leInt2Buff(31) width). */
export function random31(): Uint8Array {
  const out = new Uint8Array(31);
  crypto.getRandomValues(out);
  return out;
}

function toHex32(n: bigint): `0x${string}` {
  const h = n.toString(16).padStart(64, "0");
  return `0x${h}`;
}

async function pedersenField(data: Uint8Array): Promise<bigint> {
  const pedersen = await getPedersen();
  const babyJub = await getBabyJub();
  const hashed = pedersen.hash(data);
  const unpacked = babyJub.unpackPoint(hashed);
  if (!unpacked) throw new Error("pedersen unpack failed");
  return babyJub.F.toObject(unpacked[0]);
}

export type DepositSecrets = {
  nullifier: Uint8Array;
  secret: Uint8Array;
  preimage: Uint8Array;
  commitment: `0x${string}`;
  nullifierHash: `0x${string}`;
};

/** Circuit-exact Tornado Classic commitment = Pedersen(nullifier‖secret). */
export async function createDepositSecrets(
  nullifier?: Uint8Array,
  secret?: Uint8Array
): Promise<DepositSecrets> {
  const n = nullifier ?? random31();
  const s = secret ?? random31();
  if (n.length !== 31 || s.length !== 31) {
    throw new Error("nullifier/secret must be 31 bytes");
  }
  const preimage = new Uint8Array(62);
  preimage.set(n, 0);
  preimage.set(s, 31);
  const commitment = toHex32(await pedersenField(preimage));
  const nullifierHash = toHex32(await pedersenField(n));
  return { nullifier: n, secret: s, preimage, commitment, nullifierHash };
}

export function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0) throw new Error("odd hex");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
