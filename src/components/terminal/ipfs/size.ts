/**
 * @file size.ts
 * @description Size gate + tabular-nums display helpers (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { IPFS_MAX_BYTES } from "./constants";

export function isTooBig(size: number, max = IPFS_MAX_BYTES): boolean {
  return !Number.isFinite(size) || size < 0 || size > max;
}

/** `248576 (243.0 KiB)` — for tabular-nums rows. */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 (0 B)";
  const n = Math.floor(bytes);
  if (n < 1024) return `${n} (${n} B)`;
  if (n < 1024 * 1024) {
    const kib = n / 1024;
    return `${n} (${kib.toFixed(1)} KiB)`;
  }
  const mib = n / (1024 * 1024);
  return `${n} (${mib.toFixed(2)} MiB)`;
}

/** Compact age: `2h`, `3d`, `45m`, `12s`. */
export function formatAge(ts: number, now = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - ts) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h`;
  const days = Math.floor(hr / 24);
  return `${days}d`;
}
