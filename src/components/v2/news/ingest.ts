/**
 * @file ingest.ts
 * @description Map fetched news items into IndexedDB article records (#295 G / #323)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  extractNewsExcerpt,
  sanitizeNewsImageUrl,
  type NewsItem
} from "@/components/terminal/news";
import type { StoredNewsArticle } from "./store";

/** Optional richer fields when ingest grows past title-only feeds. */
export type NewsIngestItem = NewsItem & {
  summary?: string | null;
  body?: string | null;
};

function cleanField(raw: string | null | undefined): string {
  if (raw == null) return "";
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Build a store row from an ingest item.
 * Honest when only title exists: summary/body stay empty (not a title echo).
 * Description excerpts land in summary; content:encoded is never used as body.
 */
export function toStoredArticle(
  item: NewsIngestItem
): Omit<StoredNewsArticle, "searchText" | "ingestedAt"> {
  const title = cleanField(item.title);
  const summary = extractNewsExcerpt(item.summary ?? item.excerpt, title);
  const body = cleanField(item.body);
  return {
    id: item.id,
    title,
    summary,
    body: body && body !== title ? body : "",
    sourceName: item.sourceId,
    url: item.url,
    publishedAt: item.publishedAt || Date.now(),
    imageUrl: sanitizeNewsImageUrl(item.imageUrl || "") || ""
  };
}

export function toStoredArticles(
  items: NewsIngestItem[]
): Omit<StoredNewsArticle, "searchText" | "ingestedAt">[] {
  return items.map(toStoredArticle);
}
