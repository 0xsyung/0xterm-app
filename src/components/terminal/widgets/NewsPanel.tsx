/**
 * @file NewsPanel.tsx
 * @description INVEST News tool panel — allowlisted headlines → NewsReader (#83 panel path)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "../types";
import {
  NEWS_ERROR,
  newsPinKey,
  pageNewsItems,
  filterByTag,
  fetchNewsHeadlines,
  type NewsFetchResult,
  type NewsItem,
  type NewsSourceId
} from "../news";
import NewsReader from "./NewsReader";

type NewsPanelData = {
  items: NewsItem[];
  fetchedAt: number;
  usedRss2json: boolean;
  missing: NewsSourceId[];
};

export default function NewsPanel({
  theme,
  onClose
}: {
  theme: ThemeConfig;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NewsPanelData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const applyFetched = (fetched: NewsFetchResult, now: number) => {
    if (fetched.error === "NEWS_TRANSPORT") {
      setError(NEWS_ERROR.NEWS_TRANSPORT);
    } else if (fetched.error === "NEWS_EMPTY" || fetched.items.length === 0) {
      setError(NEWS_ERROR.NEWS_EMPTY);
    } else {
      setError(null);
      setData({
        items: fetched.items,
        fetchedAt: now,
        usedRss2json: !!fetched.usedRss2json,
        missing: fetched.missing || []
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchNewsHeadlines();
        if (cancelled) return;
        applyFetched(fetched, Date.now());
      } catch {
        if (!cancelled) setError(NEWS_ERROR.NEWS_TRANSPORT);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const fetched = await fetchNewsHeadlines(undefined, { force: true });
      applyFetched(fetched, Date.now());
    } catch {
      setError(NEWS_ERROR.NEWS_TRANSPORT);
    } finally {
      setRefreshing(false);
    }
  };

  const tag = "";
  const page = pageNewsItems(filterByTag(data?.items || [], tag), 0);
  const readerData = {
    kind: "news" as const,
    widgetId: newsPinKey(tag),
    tag,
    items: page,
    fetchedAt: data?.fetchedAt || 0,
    usedRss2json: !!data?.usedRss2json,
    missing: data?.missing || [],
    loading
  };

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  return (
    <div
      className={`w-full min-h-full flex flex-col gap-3 p-3 md:p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded}`}
      data-testid="news-panel"
      role="dialog"
      aria-label="News"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          NEWS
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Refresh news"
            title="Refresh"
            className={`uppercase text-[9px] px-1 py-0.5 border ${theme.border} ${theme.cardBg} ${theme.primary} cursor-pointer ${touch}`}
          >
            {refreshing ? "…" : "↻"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close news panel"
            title="Close news panel"
            className={`inline-flex items-center justify-center cursor-pointer bg-transparent border-0 p-0 text-[18px] leading-none min-h-[28px] min-w-[28px] pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] max-md:min-w-[44px] [@media(hover:none)]:min-h-[44px] [@media(hover:none)]:min-w-[44px] ${theme.primary}`}
            data-testid="news-panel-close"
          >
            ×
          </button>
        </div>
      </div>

      {error ? (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="news-error"
          role="alert"
        >
          {error}
        </div>
      ) : (
        <NewsReader
          data={readerData}
          theme={theme}
          onPin={undefined}
          embedded
        />
      )}
      {/* Bottom pad so the footer row stays reachable in the scroll column. */}
      <div className="h-4 shrink-0" aria-hidden data-testid="news-panel-end-pad" />
    </div>
  );
}
