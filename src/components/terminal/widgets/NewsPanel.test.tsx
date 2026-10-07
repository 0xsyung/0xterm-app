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

  it("has no pin control on the panel header (#130)", async () => {
    vi.spyOn(news, "fetchNewsHeadlines").mockResolvedValue({
      items: fixtures,
      usedRss2json: false,
      missing: []
    });
    render(<NewsPanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getAllByText("Bitcoin hits new research high").length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole("button", { name: "Pin news panel" })).toBeNull();
    expect(screen.queryByTitle("Pin to right panel")).toBeNull();
    const panel = screen.getByTestId("news-panel");
    expect(panel.textContent).not.toContain("▣");
    // No header chrome — panel opens directly to the reader.
    expect(screen.queryByRole("button", { name: "Refresh news" })).toBeNull();
    expect(screen.queryByTestId("news-panel-close")).toBeNull();
  });

  it("panel shell is full-width with no max-w cap (#130)", async () => {
    vi.spyOn(news, "fetchNewsHeadlines").mockResolvedValue({
      items: fixtures,
      usedRss2json: false,
      missing: []
    });
    render(<NewsPanel theme={theme} onClose={vi.fn()} />);
    const panel = screen.getByTestId("news-panel");
    expect(panel.className).toMatch(/\bw-full\b/);
    expect(panel.className).toMatch(/\bmin-h-full\b/);
    expect(panel.className).not.toMatch(/max-w-/);
  });

  it("Escape fires onClose (parity with other panels)", () => {
    const onClose = vi.fn();
    render(<NewsPanel theme={theme} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("panel shell is full-width with no header chrome", async () => {
    vi.spyOn(news, "fetchNewsHeadlines").mockResolvedValue({
      items: fixtures,
      usedRss2json: false,
      missing: []
    });
    render(<NewsPanel theme={theme} onClose={vi.fn()} />);
    const panel = screen.getByTestId("news-panel");
    expect(panel.className).toMatch(/\bp-3\b/);
    expect(panel.className).toMatch(/md:p-4/);
    expect(panel.className).not.toMatch(/overflow-hidden/);
    expect(panel.className).not.toMatch(/(?:^|\s)-m/);
    expect(screen.getByTestId("news-panel-end-pad")).toBeTruthy();
  });

  it("bumping refreshKey force-refreshes via fetchNewsHeadlines({force:true})", async () => {
    const spy = vi.spyOn(news, "fetchNewsHeadlines").mockResolvedValue({
      items: fixtures,
      usedRss2json: false,
      missing: []
    });
    const { rerender } = render(
      <NewsPanel theme={theme} onClose={vi.fn()} refreshKey={0} />
    );
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    rerender(<NewsPanel theme={theme} onClose={vi.fn()} refreshKey={1} />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy.mock.calls[1][1]).toEqual({ force: true });
  });
});
