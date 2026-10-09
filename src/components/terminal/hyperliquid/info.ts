/**
 * @file info.ts
 * @description Hyperliquid POST /info client (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { fetchWithRetry } from "../dexscreener";
import { hlApiBase, type HlNetwork } from "./config";

export type HlMetaUniverse = {
  name: string;
  szDecimals: number;
  maxLeverage?: number;
  onlyIsolated?: boolean;
};

export type HlMetaResponse = {
  universe: HlMetaUniverse[];
  // margin tables etc. ignored
};

export type HlAssetCtx = {
  funding?: string;
  openInterest?: string;
  prevDayPx?: string;
  dayNtlVlm?: string;
  premium?: string;
  oraclePx?: string;
  markPx?: string;
  midPx?: string;
};

export type HlPosition = {
  coin: string;
  szi: string;
  entryPx?: string;
  positionValue?: string;
  unrealizedPnl?: string;
  returnOnEquity?: string;
  liquidationPx?: string | null;
  leverage?: { type?: string; value?: number };
  marginUsed?: string;
  maxLeverage?: number;
  cumFunding?: { allTime?: string; sinceOpen?: string; sinceChange?: string };
};

export type HlClearinghouseState = {
  marginSummary?: {
    accountValue?: string;
    totalMarginUsed?: string;
    totalNtlPos?: string;
  };
  assetPositions?: { position: HlPosition; type: string }[];
  withdrawable?: string;
};

export type HlOpenOrder = {
  coin: string;
  side: string;
  limitPx: string;
  sz: string;
  oid: number;
  timestamp: number;
  origSz?: string;
  orderType?: string;
  reduceOnly?: boolean;
  isTrigger?: boolean;
  triggerPx?: string;
  isPositionTpsl?: boolean;
  cloid?: string | null;
};

async function postInfo<T>(
  network: HlNetwork,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  const res = await fetchWithRetry(
    `${hlApiBase(network)}/info`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    },
    fetchImpl
  );
  if (!res.ok) {
    throw new Error(`Hyperliquid /info HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchMeta(
  network: HlNetwork,
  fetchImpl?: typeof fetch
): Promise<HlMetaResponse> {
  return postInfo(network, { type: "meta" }, fetchImpl);
}

export async function fetchMetaAndAssetCtxs(
  network: HlNetwork,
  fetchImpl?: typeof fetch
): Promise<[HlMetaResponse, HlAssetCtx[]]> {
  return postInfo(network, { type: "metaAndAssetCtxs" }, fetchImpl);
}

export async function fetchAllMids(
  network: HlNetwork,
  fetchImpl?: typeof fetch
): Promise<Record<string, string>> {
  return postInfo(network, { type: "allMids" }, fetchImpl);
}

export async function fetchClearinghouseState(
  network: HlNetwork,
  user: string,
  fetchImpl?: typeof fetch
): Promise<HlClearinghouseState> {
  return postInfo(
    network,
    { type: "clearinghouseState", user: user.toLowerCase() },
    fetchImpl
  );
}

export async function fetchOpenOrders(
  network: HlNetwork,
  user: string,
  fetchImpl?: typeof fetch
): Promise<HlOpenOrder[]> {
  const data = await postInfo<HlOpenOrder[]>(
    network,
    { type: "openOrders", user: user.toLowerCase() },
    fetchImpl
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchExtraAgents(
  network: HlNetwork,
  user: string,
  fetchImpl?: typeof fetch
): Promise<unknown[]> {
  const data = await postInfo<unknown>(
    network,
    { type: "extraAgents", user: user.toLowerCase() },
    fetchImpl
  );
  return Array.isArray(data) ? data : [];
}

/** Returns max builder fee in tenths of a bp, or 0 if none. */
export async function fetchMaxBuilderFee(
  network: HlNetwork,
  user: string,
  builder: string,
  fetchImpl?: typeof fetch
): Promise<number> {
  const data = await postInfo<unknown>(
    network,
    {
      type: "maxBuilderFee",
      user: user.toLowerCase(),
      builder: builder.toLowerCase()
    },
    fetchImpl
  );
  const n = typeof data === "number" ? data : Number(data);
  return Number.isFinite(n) ? n : 0;
}

export function assetIndexByCoin(
  meta: HlMetaResponse,
  coin: string
): number {
  const i = meta.universe.findIndex(
    (u) => u.name.toUpperCase() === coin.toUpperCase()
  );
  return i;
}

export function midPxForCoin(
  mids: Record<string, string>,
  coin: string
): string | null {
  const direct = mids[coin] ?? mids[coin.toUpperCase()] ?? mids[coin.toLowerCase()];
  return direct != null ? String(direct) : null;
}
