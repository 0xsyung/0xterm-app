/**
 * @file labels.ts
 * @description Bundled OFAC + mixer/bridge/CEX label set (#16/#17/#170)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { getAddress, isAddress } from "viem";
import type { Label } from "./types";
import raw from "./labels/v1.json";

type RawBundle = {
  version: string;
  ofacAsOf: string;
  labels: Label[];
};

const bundle = raw as RawBundle;

/** Case-insensitive lookup map (lowercase → checksummed Label). */
const byLower = new Map<string, Label>();
for (const row of bundle.labels) {
  try {
    const checksummed = getAddress(row.address) as `0x${string}`;
    byLower.set(checksummed.toLowerCase(), { ...row, address: checksummed });
  } catch {
    // skip malformed extract rows
  }
}

export const LABEL_SET_VERSION = bundle.version;
export const OFAC_AS_OF = bundle.ofacAsOf;

export function lookupLabel(
  address: string,
  chainId?: number
): Label | undefined {
  if (!address || !isAddress(address)) return undefined;
  const hit = byLower.get(address.toLowerCase());
  if (!hit) return undefined;
  if (hit.chainId === "evm") return hit;
  if (chainId !== undefined && hit.chainId === chainId) return hit;
  if (chainId === undefined) return hit;
  return undefined;
}

export function lookupLabels(
  addresses: string[],
  chainId?: number
): Label[] {
  const out: Label[] = [];
  const seen = new Set<string>();
  for (const a of addresses) {
    const lab = lookupLabel(a, chainId);
    if (!lab) continue;
    const k = lab.address.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(lab);
  }
  return out;
}

export function labelCounts(): {
  ofac: number;
  mixer: number;
  bridge: number;
  cex: number;
} {
  const counts = { ofac: 0, mixer: 0, bridge: 0, cex: 0 };
  for (const lab of byLower.values()) {
    counts[lab.kind] += 1;
  }
  return counts;
}

/** All bundled labels (checksummed). Tests / `kyt labels`. */
export function allLabels(): Label[] {
  return [...byLower.values()];
}
