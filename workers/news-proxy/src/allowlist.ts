/**
 * Frozen NEWS RSS allowlist — keep in sync with
 * src/components/terminal/newsAllowlist.ts (#14 / #213).
 */
export const NEWS_PROXY_ALLOWLIST = [
  "https://cointelegraph.com/rss",
  "https://decrypt.co/feed",
  "https://www.coindesk.com/arc/outboundfeeds/rss",
  "https://thedefiant.io/api/feed"
] as const;

export type NewsProxyAllowUrl = (typeof NEWS_PROXY_ALLOWLIST)[number];

/** Exact https match (trailing slash normalized). Rejects everything else. */
export function isAllowedNewsProxyUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const normalized = u.href.replace(/\/$/, "");
    for (const allowed of NEWS_PROXY_ALLOWLIST) {
      if (allowed === url || allowed.replace(/\/$/, "") === normalized) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
