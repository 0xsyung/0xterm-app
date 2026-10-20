/**
 * @file store.ts
 * @description prefs.ipfs + prefs.ipfsPins load/save/cap (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { IPFS_PINS_CAP } from "./constants";
import type { IpfsPinRow, IpfsPrefs } from "./types";

export function parseIpfsPrefs(raw: unknown): IpfsPrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { provider: "pinata" };
  }
  const r = raw as Record<string, unknown>;
  const out: IpfsPrefs = { provider: "pinata" };
  if (typeof r.token === "string" && r.token) out.token = r.token;
  if (typeof r.gateway === "string" && r.gateway) out.gateway = r.gateway;
  return out;
}

export function parseIpfsPins(raw: unknown): IpfsPinRow[] {
  if (!Array.isArray(raw)) return [];
  const out: IpfsPinRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.cid !== "string" || !r.cid) continue;
    out.push({
      cid: r.cid,
      name: typeof r.name === "string" ? r.name : r.cid.slice(0, 12),
      size: typeof r.size === "number" && Number.isFinite(r.size) ? r.size : 0,
      mime: typeof r.mime === "string" ? r.mime : undefined,
      gatewayUrl: typeof r.gatewayUrl === "string" ? r.gatewayUrl : "",
      ts: typeof r.ts === "number" && Number.isFinite(r.ts) ? r.ts : Date.now(),
      source: r.source === "pin" ? "pin" : "add"
    });
  }
  return out;
}

export function loadIpfsFromPrefs(prefs: Record<string, unknown> | null | undefined): {
  ipfs: IpfsPrefs;
  pins: IpfsPinRow[];
} {
  const p = prefs || {};
  return {
    ipfs: parseIpfsPrefs(p.ipfs),
    pins: parseIpfsPins(p.ipfsPins)
  };
}

/**
 * Insert pin at front; cap at 50 (oldest dropped).
 * Returns { pins, dropped: true } when a row was dropped.
 */
export function upsertPin(
  pins: IpfsPinRow[],
  row: IpfsPinRow,
  cap = IPFS_PINS_CAP
): { pins: IpfsPinRow[]; dropped: boolean } {
  const without = pins.filter((p) => p.cid !== row.cid);
  const next = [row, ...without];
  if (next.length <= cap) return { pins: next, dropped: false };
  return { pins: next.slice(0, cap), dropped: true };
}

export function removePin(pins: IpfsPinRow[], cid: string): IpfsPinRow[] {
  return pins.filter((p) => p.cid !== cid);
}

export function findPin(pins: IpfsPinRow[], cid: string): IpfsPinRow | undefined {
  return pins.find((p) => p.cid === cid);
}

export function statusLines(
  ipfs: IpfsPrefs,
  pins: IpfsPinRow[]
): string[] {
  const tokenSet = ipfs.token ? "set" : "missing";
  const gw = ipfs.gateway || "(default ipfs.io)";
  return [
    "[ipfs]",
    `  provider  pinata`,
    `  token     ${tokenSet}`,
    `  gateway   ${gw}`,
    `  pins      ${pins.length}`
  ];
}
