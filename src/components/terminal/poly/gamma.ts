/**
 * @file gamma.ts
 * @description Polymarket Gamma discovery (list / show) — public reads (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { POLY_GAMMA_URL, POLY_LIST_CAP } from "./constants";

export type GammaMarket = {
  id: string;
  slug: string;
  question: string;
  conditionId: string;
  outcomes: string[];
  outcomePrices: number[];
  clobTokenIds: string[];
  volume: number;
  endDate: string | null;
  negRisk: boolean;
  closed: boolean;
  minimumOrderSize?: number;
  minimumTickSize?: number;
};

export type GammaFetch = typeof fetch;

function parseOutcomes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j.map(String);
    } catch {
      /* ignore */
    }
  }
  return ["Yes", "No"];
}

function parsePrices(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((x) => Number(x) || 0);
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j.map((x) => Number(x) || 0);
    } catch {
      /* ignore */
    }
  }
  return [];
}

function parseTokenIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j.map(String);
    } catch {
      /* ignore */
    }
  }
  return [];
}

export function normalizeGammaMarket(m: Record<string, unknown>): GammaMarket {
  return {
    id: String(m.id ?? m.conditionId ?? ""),
    slug: String(m.slug ?? ""),
    question: String(m.question ?? m.title ?? ""),
    conditionId: String(m.conditionId ?? m.condition_id ?? ""),
    outcomes: parseOutcomes(m.outcomes),
    outcomePrices: parsePrices(m.outcomePrices ?? m.outcome_prices),
    clobTokenIds: parseTokenIds(m.clobTokenIds ?? m.clob_token_ids),
    volume: Number(m.volumeNum ?? m.volume ?? 0) || 0,
    endDate: (m.endDate ?? m.end_date_iso ?? m.endDateIso ?? null) as string | null,
    negRisk: Boolean(m.negRisk ?? m.neg_risk),
    closed: Boolean(m.closed),
    minimumOrderSize:
      m.orderMinSize != null
        ? Number(m.orderMinSize)
        : m.minimum_order_size != null
          ? Number(m.minimum_order_size)
          : undefined,
    minimumTickSize:
      m.orderPriceMinTickSize != null
        ? Number(m.orderPriceMinTickSize)
        : m.minimum_tick_size != null
          ? Number(m.minimum_tick_size)
          : undefined
  };
}

export async function gammaSearch(
  query: string | undefined,
  opts?: { fetch?: GammaFetch; limit?: number }
): Promise<GammaMarket[]> {
  const f = opts?.fetch ?? fetch;
  const limit = opts?.limit ?? POLY_LIST_CAP;
  const q = (query || "").trim();
  let url: string;
  if (q) {
    url = `${POLY_GAMMA_URL}/public-search?q=${encodeURIComponent(q)}&limit_per_type=${limit}`;
  } else {
    url = `${POLY_GAMMA_URL}/markets?closed=false&limit=${limit}&active=true`;
  }
  const res = await f(url);
  if (!res.ok) throw new Error(`Gamma ${res.status}`);
  const body = (await res.json()) as unknown;
  let rows: Record<string, unknown>[] = [];
  if (Array.isArray(body)) {
    rows = body as Record<string, unknown>[];
  } else if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (Array.isArray(o.markets)) rows = o.markets as Record<string, unknown>[];
    else if (Array.isArray(o.events)) {
      // public-search returns events with nested markets
      for (const ev of o.events as Record<string, unknown>[]) {
        const mkts = ev.markets;
        if (Array.isArray(mkts)) rows.push(...(mkts as Record<string, unknown>[]));
      }
    }
  }
  return rows.slice(0, limit).map(normalizeGammaMarket).filter((m) => m.id || m.slug);
}

export async function gammaGetMarket(
  idOrSlug: string,
  opts?: { fetch?: GammaFetch }
): Promise<GammaMarket | null> {
  const f = opts?.fetch ?? fetch;
  const q = idOrSlug.trim();
  if (!q) return null;

  // Try by slug first, then id.
  const tries = [
    `${POLY_GAMMA_URL}/markets?slug=${encodeURIComponent(q)}`,
    `${POLY_GAMMA_URL}/markets/${encodeURIComponent(q)}`,
    `${POLY_GAMMA_URL}/markets?condition_ids=${encodeURIComponent(q)}`
  ];
  for (const url of tries) {
    try {
      const res = await f(url);
      if (!res.ok) continue;
      const body = (await res.json()) as unknown;
      if (Array.isArray(body) && body.length > 0) {
        return normalizeGammaMarket(body[0] as Record<string, unknown>);
      }
      if (body && typeof body === "object" && !Array.isArray(body)) {
        return normalizeGammaMarket(body as Record<string, unknown>);
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export function resolveOutcomeToken(
  market: GammaMarket,
  outcomeRaw: string
): { outcome: string; tokenId: string; price: number; index: number } | null {
  const o = outcomeRaw.trim().toLowerCase();
  let idx = market.outcomes.findIndex((x) => x.toLowerCase() === o);
  if (idx < 0) {
    // numeric 0/1 or yes/no shortcuts
    if (o === "yes" || o === "y" || o === "0") idx = 0;
    else if (o === "no" || o === "n" || o === "1") idx = Math.min(1, market.outcomes.length - 1);
  }
  if (idx < 0 || idx >= market.clobTokenIds.length) return null;
  return {
    outcome: market.outcomes[idx] || outcomeRaw,
    tokenId: market.clobTokenIds[idx],
    price: market.outcomePrices[idx] ?? 0.5,
    index: idx
  };
}
