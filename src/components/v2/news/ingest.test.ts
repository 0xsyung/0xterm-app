/**
 * @file ingest.test.ts
 * @description News toStored mapping — honest excerpts, imageUrl, no title echo
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
  it("keeps summary/body/imageUrl empty when ingest is title-only (no title echo)", () => {
    const row = toStoredArticle(base);
    expect(row.title).toBe("Ethereum upgrade lands");
    expect(row.summary).toBe("");
    expect(row.body).toBe("");
    expect(row.imageUrl).toBe("");
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
      body: "Ethereum upgrade lands",
      excerpt: "Ethereum upgrade lands"
    });
    expect(row.summary).toBe("");
    expect(row.body).toBe("");
  });

  it("maps excerpt onto summary and persists a sanitized imageUrl", () => {
    const row = toStoredArticle({
      ...base,
      excerpt: "Validators finalize the hard fork on mainnet.",
      imageUrl: "https://www.coindesk.com/image.jpg"
    });
    expect(row.summary).toBe("Validators finalize the hard fork on mainnet.");
    expect(row.imageUrl).toBe("https://www.coindesk.com/image.jpg");
  });

  it("drops an unsafe imageUrl and a title-echo excerpt", () => {
    const row = toStoredArticle({
      ...base,
      excerpt: "Ethereum upgrade lands.",
      imageUrl: "https://evil.test/pwn.png"
    });
    expect(row.summary).toBe("");
    expect(row.imageUrl).toBe("");
  });

  it("maps lists via toStoredArticles", () => {
    expect(toStoredArticles([base])).toHaveLength(1);
  });
});
