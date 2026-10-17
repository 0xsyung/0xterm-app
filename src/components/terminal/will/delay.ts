/**
 * @file delay.ts
 * @description CLI delay parser — Nd / Nw / Ny only (#26)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  WILL_DEFAULT_DELAY_SEC,
  WILL_MAX_DELAY_SEC,
  WILL_MIN_DELAY_SEC
} from "./constants";

export type ParseDelayResult =
  | { ok: true; seconds: number; human: string }
  | { ok: false; reason: string };

/**
 * Parse `90d` / `1w` / `1y`. Reject bare numbers, h, m, 0d, below min, above max.
 */
export function parseDelay(raw: string | undefined | null): ParseDelayResult {
  if (raw == null || String(raw).trim() === "") {
    return {
      ok: true,
      seconds: WILL_DEFAULT_DELAY_SEC,
      human: formatDelayHuman(WILL_DEFAULT_DELAY_SEC)
    };
  }
  const s = String(raw).trim().toLowerCase();
  // bare number → refuse (seconds accident)
  if (/^\d+$/.test(s)) {
    return {
      ok: false,
      reason: `Delay must use a suffix (Nd/Nw/Ny), not a bare number. Got "${raw}".`
    };
  }
  const m = /^(\d+)([dwy])$/.exec(s);
  if (!m) {
    return {
      ok: false,
      reason: `Invalid delay "${raw}". Use Nd / Nw / Ny only (e.g. 90d, 1w, 1y). No hours or minutes.`
    };
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, reason: `Invalid delay "${raw}".` };
  }
  const unit = m[2] as "d" | "w" | "y";
  const seconds =
    unit === "d" ? n * 86400 : unit === "w" ? n * 7 * 86400 : n * 365 * 86400;

  if (seconds < WILL_MIN_DELAY_SEC) {
    return {
      ok: false,
      reason: `Delay too short (min 7d). Got "${raw}".`
    };
  }
  if (seconds > WILL_MAX_DELAY_SEC) {
    return {
      ok: false,
      reason: `Delay too long (max 730d). Got "${raw}".`
    };
  }
  return { ok: true, seconds, human: formatDelayHuman(seconds) };
}

/** Prefer day form when exact days; else weeks/years when exact. */
export function formatDelayHuman(seconds: number): string {
  if (seconds % (365 * 86400) === 0) return `${seconds / (365 * 86400)}y`;
  if (seconds % (7 * 86400) === 0 && seconds % 86400 === 0) {
    const weeks = seconds / (7 * 86400);
    // Prefer days for common values like 90d (not 12w+6d nonsense)
    if (seconds % 86400 === 0) {
      const days = seconds / 86400;
      if (days % 7 !== 0 || days <= 14) return `${days}d`;
      return `${weeks}w`;
    }
  }
  if (seconds % 86400 === 0) return `${seconds / 86400}d`;
  return `${seconds}s`;
}

export function formatAge(secondsAgo: number): string {
  if (secondsAgo < 0) secondsAgo = 0;
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  return `${Math.floor(secondsAgo / 86400)}d ago`;
}

export function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "CLAIMABLE NOW";
  if (secondsLeft < 60) return `${secondsLeft}s`;
  if (secondsLeft < 3600) return `${Math.floor(secondsLeft / 60)}m`;
  if (secondsLeft < 86400) {
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(secondsLeft / 86400);
  const h = Math.floor((secondsLeft % 86400) / 3600);
  return h ? `${d}d ${h}h` : `${d}d`;
}
