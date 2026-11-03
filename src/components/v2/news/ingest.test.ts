/**
 * @file ingest.test.ts
 * @description News toStored mapping — honest title-only vs richer fields
 */
import { describe, expect, it } from "vitest";
import { toStoredArticle, toStoredArticles } from "./ingest";

const base = {
  id: "n1",
  sourceId: "coindesk" as const,
  title: "Ethereum upgrade lands",
  url: "https://example.com/a",
  publishedAt: 1_700_000_000_000
};

describe("toStoredArticle", () => {
  it("keeps summary/body empty when ingest is title-only (no title echo)", () => {
    const row = toStoredArticle(base);
    expect(row.title).toBe("Ethereum upgrade lands");
    expect(row.summary).toBe("");
    expect(row.body).toBe("");
    expect(row.sourceName).toBe("coindesk");
  });

  it("prefers richer summary/body when present", () => {
    const row = toStoredArticle({
      ...base,
      summary: "Validators finalize the hard fork.",
      body: "Full article body with context."
    });
    expect(row.summary).toBe("Validators finalize the hard fork.");
    expect(row.body).toBe("Full article body with context.");
  });

  it("does not treat a title-identical summary as richer copy", () => {
    const row = toStoredArticle({
      ...base,
      summary: "Ethereum upgrade lands",
      body: "Ethereum upgrade lands"
    });
    // Identical to title → store empty rather than redundant echo for search quality
    expect(row.summary).toBe("");
    expect(row.body).toBe("");
  });

  it("maps lists via toStoredArticles", () => {
    expect(toStoredArticles([base])).toHaveLength(1);
  });
});
