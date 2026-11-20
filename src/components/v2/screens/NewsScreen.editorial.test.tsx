/** @vitest-environment jsdom */
/**
 * @file NewsScreen.editorial.test.tsx
 * @description #323 — V2 News editorial reader in Finance chrome
 */
import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FINANCE_THEME } from "../theme";
import {
  NEWS_IDB_NAME,
  upsertNewsArticles,
  type StoredNewsArticle
} from "../news/store";

vi.mock("@/components/terminal/news", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/terminal/news")>();
  return {
    ...actual,
    fetchNewsHeadlines: vi.fn(async () => ({
      items: [],
      usedRss2json: false,
      missing: []
    }))
  };
});

import NewsScreen from "./NewsScreen";

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
): Omit<StoredNewsArticle, "searchText" | "ingestedAt"> {
  return {
    summary: partial.summary ?? "",
    body: partial.body ?? "",
    sourceName: partial.sourceName || "coindesk",
    url: partial.url || `https://www.coindesk.com/${partial.id}`,
    publishedAt: partial.publishedAt ?? 1_700_000_000_000,
    imageUrl: partial.imageUrl ?? "",
    ...partial
  };
}

const ARTICLES: Omit<StoredNewsArticle, "searchText" | "ingestedAt">[] = [
  article({
    id: "lead",
    title: "Bitcoin blockchain research high",
    publishedAt: 5,
    imageUrl: "https://www.coindesk.com/images/lead.jpg",
    summary: "Miners report higher hash rate this week."
  }),
  article({
    id: "sup-1",
    title: "DeFi staking yields update",
    sourceName: "defiant",
    publishedAt: 4,
    url: "https://thedefiant.io/sup-1"
  }),
  article({
    id: "sup-2",
    title: "Market volatility watch",
    sourceName: "decrypt",
    publishedAt: 3,
    url: "https://decrypt.co/sup-2"
  }),
  article({
    id: "more-1",
    title: "AI models price crypto risk",
    sourceName: "cointelegraph",
    publishedAt: 2,
    url: "https://cointelegraph.com/more-1"
  }),
  article({
    id: "more-2",
    title: "Regulation hearing on ETFs",
    publishedAt: 1,
    url: "https://www.coindesk.com/more-2"
  })
];

async function renderNews() {
  const view = render(<NewsScreen theme={FINANCE_THEME} />);
  await waitFor(() => {
    expect(screen.queryByTestId("v2-news-loading")).toBeNull();
  }, { timeout: 4000 });
  return view;
}

describe("NewsScreen editorial reader (#323)", () => {
  beforeEach(async () => {
    await resetDb();
    await upsertNewsArticles(ARTICLES);
  });

  afterEach(() => cleanup());

  it("renders 0xTERM research masthead start-aligned, not Bloomberg uppercase", async () => {
    await renderNews();
    const masthead = screen.getByTestId("v2-news-masthead");
    const heading = within(masthead).getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("0xTERM research");
    expect(heading.className).toMatch(/text-lg/);
    expect(heading.className).toMatch(/font-bold/);
    expect(heading.className).toMatch(/font-plex/);
    expect(heading.className).toMatch(/tracking-tight/);
    expect(heading.className).not.toMatch(/uppercase/);
    expect(heading.className).not.toMatch(/tracking-widest/);
    expect(masthead.className).not.toMatch(/justify-between/);
    const asOf = screen.getByTestId("v2-news-as-of");
    expect(asOf.textContent).toMatch(/^as of /);
    expect(asOf.className).toMatch(/text-\[11px\]/);
    expect(asOf.className).toMatch(/tabular-nums/);
    expect(asOf.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it("lays out lead, supporting, and MORE on the filtered set", async () => {
    await renderNews();
    const lead = screen.getByTestId("v2-news-lead");
    const supporting = screen.getByTestId("v2-news-supporting");
    const more = screen.getByTestId("v2-news-more");
    expect(lead.querySelector('[data-variant="lead"]')?.textContent).toMatch(
      /Bitcoin blockchain research high/
    );
    const leadTitle = Array.from(lead.querySelectorAll("div")).find((d) =>
      d.className.includes("line-clamp-3")
    );
    expect(leadTitle?.className).toMatch(/\btext-base\b/);
    expect(leadTitle?.className).toMatch(/line-clamp-3/);
    expect(supporting.querySelectorAll('[data-testid="v2-news-card"]')).toHaveLength(2);
    expect(supporting.className).toMatch(/grid-cols-2/);
    expect(supporting.className).toMatch(/md:grid-cols-1/);
    expect(more.textContent).toMatch(/MORE/);
    expect(more.querySelectorAll('[data-testid="v2-news-card"]')).toHaveLength(2);
    more.querySelectorAll('[data-testid="v2-news-card"]').forEach((card) => {
      expect((card as HTMLElement).className).not.toMatch(/text-xs/);
      expect((card as HTMLElement).className).not.toMatch(/text-\[11px\]/);
      const title = Array.from(card.querySelectorAll("div")).find((d) =>
        d.className.includes("line-clamp-2")
      );
      expect(title?.className).toMatch(/\btext-sm\b/);
    });
  });

  it("keeps the editorial layout under search and category filters", async () => {
    await renderNews();
    fireEvent.click(screen.getByTestId("v2-news-cat-defi"));
    await waitFor(() => {
      expect(screen.getByTestId("v2-news-lead").textContent).toMatch(/DeFi staking/);
    });
    expect(screen.queryByTestId("v2-news-more")).toBeNull();
    expect(screen.queryByTestId("v2-news-detail")).toBeNull();

    fireEvent.click(screen.getByTestId("v2-news-cat-all"));
    fireEvent.change(screen.getByTestId("v2-news-search"), {
      target: { value: "regulation hearing" }
    });
    await waitFor(() => {
      expect(screen.getByTestId("v2-news-query-echo").textContent).toMatch(
        /Results for “regulation hearing”/
      );
    });
    expect(screen.getByTestId("v2-news-lead").textContent).toMatch(/Regulation hearing/);
    expect(screen.getByTestId("v2-news-list")).not.toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("shows a feed thumb when imageUrl is present and a monogram when it is not", async () => {
    await renderNews();
    const leadThumb = within(screen.getByTestId("v2-news-lead")).getByTestId(
      "v2-news-thumb"
    );
    expect(leadThumb.getAttribute("data-thumb")).toBe("image");
    expect(leadThumb.querySelector("img")?.getAttribute("src")).toBe(
      "https://www.coindesk.com/images/lead.jpg"
    );
    expect(leadThumb.className).toMatch(/aspect-video/);
    expect(leadThumb.className).toMatch(/\bp-1\b/);

    const supportThumb = within(screen.getByTestId("v2-news-supporting")).getAllByTestId(
      "v2-news-thumb"
    )[0];
    expect(supportThumb.getAttribute("data-thumb")).toBe("monogram");
    expect(supportThumb.querySelector("img")).toBeNull();
    expect(within(supportThumb).getByTestId("v2-news-thumb-monogram").textContent).toBe(
      "DF"
    );
  });

  it("opens the source in one click and does not mount a detail stub or V1 chrome", async () => {
    await renderNews();
    const card = within(screen.getByTestId("v2-news-lead")).getByTestId("v2-news-card");
    expect(card.tagName).toBe("A");
    expect(card.getAttribute("target")).toBe("_blank");
    expect(card.getAttribute("rel")).toBe("noopener noreferrer");
    expect(card.getAttribute("href")).toBe("https://www.coindesk.com/lead");
    fireEvent.click(card);
    expect(screen.queryByTestId("v2-news-detail")).toBeNull();
    expect(screen.queryByText("Open source")).toBeNull();
    expect(screen.queryByText("← News")).toBeNull();
    expect(screen.queryByTestId("news-reader")).toBeNull();
    expect(screen.queryByText("pinned")).toBeNull();
    expect(screen.queryByText("Fetching headlines…")).toBeNull();
    expect(card.textContent).not.toMatch(/Miners report higher hash rate/);
  });

  it("caps the search field at 320px with an 11px label", async () => {
    await renderNews();
    const label = screen.getByTestId("v2-news-search-label");
    expect(label.className).toMatch(/text-\[11px\]/);
    expect(label.className).toMatch(/max-w-\[320px\]/);
    expect(label.className).not.toMatch(/text-\[10px\]/);
    expect(label.className).not.toMatch(/max-w-\[448px\]/);
    const input = screen.getByTestId("v2-news-search");
    expect(input.className).toMatch(/max-w-\[320px\]/);
    expect(input.className).toMatch(/text-base/);
    expect(input.className).toMatch(/min-h-\[44px\]/);
    expect(input.className).not.toMatch(/max-w-\[448px\]/);
  });

  it("keeps category chips scrollable with 44px targets and end pad", async () => {
    await renderNews();
    const chips = screen.getByTestId("v2-news-category-tabs");
    expect(chips.className).toMatch(/overflow-x-auto/);
    expect(screen.getByTestId("v2-news-cat-scroll-pad")).not.toBeNull();
    const defi = screen.getByTestId("v2-news-cat-defi");
    expect(defi.className).toMatch(/min-h-\[44px\]/);
    expect(defi.className).toMatch(/uppercase/);
    expect(defi.className).toMatch(/tracking-widest/);
    expect(chips.compareDocumentPosition(screen.getByTestId("v2-news-masthead")) &
      Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(chips.compareDocumentPosition(screen.getByTestId("v2-news-search-label")) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows V2 empty copy when the archive has no rows", async () => {
    await resetDb();
    await renderNews();
    expect(screen.getByTestId("v2-news-empty").textContent).toBe(
      "No news accumulated yet."
    );
    expect(screen.queryByText("No items found.")).toBeNull();
    fireEvent.change(screen.getByTestId("v2-news-search"), {
      target: { value: "nope" }
    });
    expect(screen.getByTestId("v2-news-empty").textContent).toBe("No matching news.");
  });
});
