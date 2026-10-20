/**
 * @file helpers.ts
 * @description Pure helper functions shared by terminal commands
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address } from "viem";
import type { CustomTokenEntry, CustomTokensMap, PinnedManifest } from "./types";
import { TICKER_REFRESH_SEC } from "./ticker";

/**
 * Pin allowlist (issue #35): only live, glanceable monitors can be pinned.
 * Price / KYT / KYA are `component` kinds (`componentData.kind`);
 * dig-artifact (#39), dig-run (#40), dig-debug (#41) are workshop exceptions. Editor / opcodes / abi are not
 * pinnable. Other component kinds (swap/pool/deploy/export) are stripped.
 */
export const PINNABLE_KINDS = new Set(["balance", "portfolio", "ticker", "news", "pnl", "dig-artifact", "dig-run", "dig-debug", "feedback", "allowances", "vault", "poly", "mixer", "will", "plan", "when", "ipfs"]);

const PINNABLE_COMPONENT_KINDS = new Set(["price", "kyt", "kya"]);

export const isPinnableLog = (log: {
  type: string;
  componentData?: { kind?: string };
}): boolean => {
  if (log.type === "component")
    return PINNABLE_COMPONENT_KINDS.has(log.componentData?.kind ?? "");
  return PINNABLE_KINDS.has(log.type);
};

export const isPinnableManifest = (m: unknown): boolean => {
  if (!m || typeof m !== "object") return false;
  const kind = (m as { kind?: string }).kind;
  if (!kind) return false;
  if (kind === "component") {
    const cd = (m as { componentData?: { kind?: string } }).componentData;
    return PINNABLE_COMPONENT_KINDS.has(cd?.kind ?? "");
  }
  return PINNABLE_KINDS.has(kind);
};

/**
 * Stable dedupe key for a pinned price widget. Returns null when the payload
 * is not a price kind or lacks the parts needed to address it.
 */
export const pricePinKey = (
  cd: any,
  activeChain: number | null,
  activeDex: string | null
): string | null => {
  if (cd?.kind !== "price") return null;
  if (cd.mode === "onchain") {
    const addr = cd.pairAddress as string | undefined;
    if (!activeChain || !activeDex || !addr) return null;
    return `price:onchain:${activeChain}:${activeDex}:${addr.toLowerCase()}`;
  }
  // api mode — network slug + dex + pair tokens
  const net = (cd.chain as string) || "";
  const d = (cd.dex as string) || "";
  const q = `${cd.tokenSymbol || ""}/${cd.quoteSymbol || ""}`.toLowerCase();
  if (!net || !d || q === "/") return null;
  return `price:api:${net}:${d}:${q}`;
};

/** Price pin auto-refresh cadence — same as CONSOLE ticker (#169 Soft ACK). */
export const PRICE_PIN_REFRESH_SEC = TICKER_REFRESH_SEC;

/** Ensure price pin manifests use the 15s ticker cadence (#169). */
export function withPricePinRefreshSec<T extends { kind?: string; componentData?: { kind?: string }; refreshSec?: number }>(
  m: T
): T {
  if (m.kind === "component" && m.componentData?.kind === "price") {
    return { ...m, refreshSec: PRICE_PIN_REFRESH_SEC };
  }
  return m;
}

/**
 * Apply a pin refresh outcome: success updates payload/componentData and clears
 * STALE; failure keeps last quote and marks STALE (#169 Soft ACK). Quiet — no wipe.
 */
export function applyPinRefreshOutcome(
  pin: PinnedManifest,
  outcome: { ok: true; payload: unknown } | { ok: false }
): PinnedManifest {
  if (!outcome.ok) {
    return { ...pin, stale: true };
  }
  const payload = outcome.payload;
  const hasComponentData =
    payload !== null &&
    typeof payload === "object" &&
    "componentData" in (payload as object);
  if (hasComponentData) {
    return {
      ...pin,
      componentData: (payload as { componentData: unknown }).componentData,
      stale: false
    };
  }
  return { ...pin, payload, stale: false };
}

// Normalize a raw stored custom-token blob into the current list-per-chain
// shape. Accepts both the new form (chain -> array) and the legacy form
// (chain -> symbol-keyed object). Idempotent; malformed entries are dropped.
export const migrateCustomTokens = (raw: any): CustomTokensMap => {
  const out: CustomTokensMap = {};
  const toEntry = (t: any): CustomTokenEntry | null => {
    if (!t || typeof t !== "object" || !t.address) return null;
    const addr = t.address as string;
    return {
      id: typeof t.id === "string" ? t.id : `c_${addr.toLowerCase()}`,
      address: addr as Address,
      symbol: String(t.symbol ?? "?"),
      name: String(t.name ?? ""),
      decimals: typeof t.decimals === "number" ? t.decimals : undefined,
      tokenType:
        t.tokenType === "erc721"
          ? "erc721"
          : t.tokenType === "erc20"
            ? "erc20"
            : undefined,
      isNative: !!t.isNative
    };
  };
  for (const [chainIdStr, value] of Object.entries(raw ?? {})) {
    const chainId = Number(chainIdStr);
    const entries: CustomTokenEntry[] = [];
    if (Array.isArray(value)) {
      for (const t of value) {
        const e = toEntry(t);
        if (e) entries.push(e);
      }
    } else if (value && typeof value === "object") {
      // legacy: symbol-keyed token map
      for (const t of Object.values(value)) {
        const e = toEntry(t);
        if (e) entries.push(e);
      }
    }
    if (entries.length > 0) out[chainId] = entries;
  }
  return out;
};
