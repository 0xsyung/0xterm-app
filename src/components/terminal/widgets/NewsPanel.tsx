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
  onClose,
  refreshKey = 0,
  frameless = false
}: {
  theme: ThemeConfig;
  /** Escape-close parity with other tool panels. */
  onClose: () => void;
  /** Bump to force-refresh (re-clicking the active NEWS tool tab). */
  refreshKey?: number;
  /** Inline mode: drop the outer card frame (border/bg/rounded/padding). */
  frameless?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NewsPanelData | null>(null);

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
    setError(null);
    try {
      const fetched = await fetchNewsHeadlines(undefined, { force: true });
      applyFetched(fetched, Date.now());
    } catch {
      setError(NEWS_ERROR.NEWS_TRANSPORT);
    }
  };

  // Re-clicking the active NEWS tool tab bumps refreshKey → force refresh.
  useEffect(() => {
    if (refreshKey <= 0) return;
    void refresh();
  }, [refreshKey]);

  // Escape closes the panel — parity with Price/Swap/Sim/Trace.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  return (
    <div
      className={`w-full min-h-full flex flex-col gap-3 ${
        frameless ? "" : `p-3 md:p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="news-panel"
      role="dialog"
      aria-label="News"
    >
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
