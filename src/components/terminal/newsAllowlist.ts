/**
 * @file newsAllowlist.ts
 * @description Frozen RSS allowlist for news (#14). CryptoPanic out of v1.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type NewsSourceId =
  | "cointelegraph"
  | "decrypt"
  | "coindesk"
  | "defiant";

export type NewsCategory = "News" | "Insights" | "Reports";

export type NewsAllowItem = {
  id: NewsSourceId;
  name: string;
  rssUrl: string;
  /** Editorial taxonomy bucket for NewsReader (#83). */
  category?: NewsCategory;
};

/**
 * Publisher-origin RSS only. Optional later: `news set cryptopanic <token>`
 * is out of v1 (paid) — leave this comment, not a command.
 */
export const NEWS_ALLOWLIST: readonly NewsAllowItem[] = [
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    rssUrl: "https://cointelegraph.com/rss",
    category: "News"
  },
  {
    id: "decrypt",
    name: "Decrypt",
    rssUrl: "https://decrypt.co/feed",
    category: "Insights"
  },
  {
    id: "coindesk",
    name: "CoinDesk",
    // Frozen 2026-09-13: HTTP 200 application/xml (no trailing slash needed)
    rssUrl: "https://www.coindesk.com/arc/outboundfeeds/rss",
    category: "News"
  },
  {
    id: "defiant",
    name: "The Defiant",
    // Frozen 2026-09-13: /feed → 301 → /api/feed (final)
    rssUrl: "https://thedefiant.io/api/feed",
    category: "Reports"
  }
] as const;

export const NEWS_ALLOWLIST_BY_URL: ReadonlyMap<string, NewsAllowItem> = new Map(
  NEWS_ALLOWLIST.map((a) => [a.rssUrl, a])
);

export const NEWS_ALLOWLIST_BY_ID: ReadonlyMap<NewsSourceId, NewsAllowItem> =
  new Map(NEWS_ALLOWLIST.map((a) => [a.id, a]));

export const NEWS_FOOTER_BASE =
  "Headlines: Cointelegraph · Decrypt · CoinDesk · The Defiant. Titles only. Not investment advice.";

export const NEWS_FOOTER_RSS2JSON =
  " via rss2json (allowlisted feeds only).";

export const RSS2JSON_ENDPOINT = "https://api.rss2json.com/v1/api.json";

/**
 * Thumbnail host allowlist (#126). https only; unknown host → treat as missing.
 * Derived from live feed enclosure/thumbnail hosts for the four publishers.
 */
const NEWS_THUMB_HOST_SUFFIXES = [
  "ctmedia.io", // Cointelegraph CDN (e.g. s3-images.ctmedia.io)
  "cointelegraph.com",
  "coindesk.com",
  "decrypt.co", // cdn.decrypt.co, img.decrypt.co
  "thedefiant.io",
  "cdn.sanity.io" // CoinDesk + The Defiant media CDN
] as const;

/** True when hostname is an exact or subdomain match of a thumb suffix. */
export const isAllowedNewsThumbHost = (host: string): boolean => {
  const h = String(host || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!h) return false;
  for (const suffix of NEWS_THUMB_HOST_SUFFIXES) {
    if (h === suffix || h.endsWith(`.${suffix}`)) return true;
  }
  return false;
};

/**
 * Sanitize a candidate news thumbnail URL.
 * https only; reject javascript/data/relative/http; host must be allowlisted.
 * Returns the normalized href or null.
 */
export const sanitizeNewsImageUrl = (
  raw: string | null | undefined
): string | null => {
  const s = String(raw ?? "")
    .trim()
    // rss2json / RSS sometimes leave HTML entities in query strings
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
  if (!s) return null;
  // Reject schemeless / relative / dangerous schemes early
  if (/^(javascript|data|blob|file|vbscript):/i.test(s)) return null;
  if (!/^https:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (!isAllowedNewsThumbHost(host)) return null;
    // Drop fragment; keep query (CDN crop params)
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
};
