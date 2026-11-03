/**
 * @file ingest.ts
 * @description Map fetched news items into IndexedDB article records (#295 G)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { NewsItem } from "@/components/terminal/news";
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
 * When richer summary/body arrive on ingest, they are preferred.
 */
export function toStoredArticle(
  item: NewsIngestItem
): Omit<StoredNewsArticle, "searchText" | "ingestedAt"> {
  const title = cleanField(item.title);
  const summary = cleanField(item.summary);
  const body = cleanField(item.body);
  return {
    id: item.id,
    title,
    summary: summary && summary !== title ? summary : "",
    body: body && body !== title ? body : "",
    sourceName: item.sourceId,
    url: item.url,
    publishedAt: item.publishedAt || Date.now()
  };
}

export function toStoredArticles(
  items: NewsIngestItem[]
): Omit<StoredNewsArticle, "searchText" | "ingestedAt">[] {
  return items.map(toStoredArticle);
}
