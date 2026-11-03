/**
 * @file store.test.ts
 * @description V2 news IndexedDB accumulate + local search (#295 G)
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  NEWS_IDB_NAME,
  buildSearchText,
  getNewsArticle,
  getNewsMeta,
  listNewsArticles,
  retentionCutoffMs,
  searchNewsArticles,
  setNewsRetention,
  upsertNewsArticles,
  type StoredNewsArticle
} from "./store";

async function resetDb() {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(NEWS_IDB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function article(
  partial: Partial<StoredNewsArticle> & Pick<StoredNewsArticle, "id" | "title">
) {
  return {
    summary: partial.summary || partial.title,
    body: partial.body || partial.title,
    sourceName: partial.sourceName || "wire",
    url: partial.url || `https://example.com/${partial.id}`,
    publishedAt: partial.publishedAt || Date.now(),
    ...partial
  };
}

describe("news store", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("buildSearchText lowercases title summary body source", () => {
    expect(
      buildSearchText({
        title: "Hello ETH",
        summary: "Rally",
        body: "Body",
        sourceName: "CoinDesk"
      })
    ).toBe("hello eth rally body coindesk");
  });

  it("retentionCutoffMs: all has no cutoff; 90d/1y bounded", () => {
    const now = 1_700_000_000_000;
    expect(retentionCutoffMs("all", now)).toBeNull();
    expect(retentionCutoffMs("90d", now)).toBe(now - 90 * 86400000);
    expect(retentionCutoffMs("1y", now)).toBe(now - 365 * 86400000);
  });

  it("accumulates articles and searches locally", async () => {
    const n = await upsertNewsArticles([
      article({ id: "1", title: "Ethereum upgrade", sourceName: "Alpha" }),
      article({ id: "2", title: "Bitcoin ETF flows", sourceName: "Beta" })
    ]);
    expect(n).toBe(2);
    const all = await listNewsArticles();
    expect(all).toHaveLength(2);
    const hits = searchNewsArticles(all, "ethereum alpha");
    expect(hits.map((h) => h.id)).toEqual(["1"]);
    expect(searchNewsArticles(all, "nope")).toEqual([]);
    const one = await getNewsArticle("2");
    expect(one?.title).toContain("Bitcoin");
  });

  it("default retention is All and can be changed", async () => {
    expect((await getNewsMeta()).retention).toBe("all");
    const next = await setNewsRetention("90d");
    expect(next.retention).toBe("90d");
    expect((await getNewsMeta()).retention).toBe("90d");
  });
});
