// @vitest-environment jsdom
/**
 * @file NewsPanel.test.tsx
 * @description Smoke tests for the INVEST News tool panel (#83 panel path)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import * as news from "../news";
import type { NewsItem } from "../news";
import NewsPanel from "./NewsPanel";

const theme = THEMES.matrix;

const fixtures: NewsItem[] = [
  {
    id: "1",
    sourceId: "cointelegraph",
    title: "Bitcoin hits new research high",
    url: "https://cointelegraph.com/news/btc",
    publishedAt: Date.parse("2026-09-14T13:35:00.000Z")
  },
  {
    id: "2",
    sourceId: "decrypt",
    title: "ETH staking insights",
    url: "https://decrypt.co/eth",
    publishedAt: Date.parse("2026-09-14T12:00:00.000Z")
  }
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("NewsPanel", () => {
  it("fetches and renders NewsReader headlines", async () => {
    vi.spyOn(news, "fetchNewsHeadlines").mockResolvedValue({
      items: fixtures,
      usedRss2json: false,
      missing: []
    });
    render(<NewsPanel theme={theme} onClose={vi.fn()} />);
    expect(screen.getByTestId("news-panel")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getAllByText("Bitcoin hits new research high").length).toBeGreaterThan(0);
    });
    expect(screen.getByTestId("news-reader")).toBeTruthy();
  });

  it("shows transport error when fetch fails", async () => {
    vi.spyOn(news, "fetchNewsHeadlines").mockResolvedValue({
      items: [],
      usedRss2json: false,
      missing: ["cointelegraph", "decrypt", "coindesk", "defiant"],
      error: "NEWS_TRANSPORT"
    });
    render(<NewsPanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("news-error").textContent).toMatch(
        /could not fetch news/i
      );
    });
  });

  it("pins a news manifest when ▣ clicked", async () => {
    vi.spyOn(news, "fetchNewsHeadlines").mockResolvedValue({
      items: fixtures,
      usedRss2json: false,
      missing: []
    });
    const onPin = vi.fn();
    render(<NewsPanel theme={theme} onClose={vi.fn()} onPin={onPin} />);
    await waitFor(() => {
      expect(screen.getAllByText("Bitcoin hits new research high").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole("button", { name: "Pin news panel" }));
    expect(onPin).toHaveBeenCalledTimes(1);
    const data = onPin.mock.calls[0][0];
    expect(data.kind).toBe("news");
    expect(data.widgetId).toBe("news:all");
    expect(data.items.length).toBeGreaterThan(0);
  });

  it("close button fires onClose", () => {
    const onClose = vi.fn();
    render(<NewsPanel theme={theme} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("news-panel-close"));
    expect(onClose).toHaveBeenCalled();
  });
});
