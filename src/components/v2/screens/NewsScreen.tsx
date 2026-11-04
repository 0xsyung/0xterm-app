/**
 * @file NewsScreen.tsx
 * @description V2 News N1–N3 — accumulate + local search (#295 G)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeConfig } from "@/components/terminal/types";
import { BTN_TOUCH, btnClass } from "@/components/terminal/ui/buttonClasses";
import {
  fieldClass,
  fieldLabelClass
} from "@/components/terminal/ui/fieldClasses";
import {
  NEWS_READER_CATEGORIES,
  categoryOf,
  fetchNewsHeadlines,
  type NewsReaderCategoryFilter
} from "@/components/terminal/news";
import {
  getNewsArticle,
  listNewsArticles,
  searchNewsArticles,
  upsertNewsArticles,
  type StoredNewsArticle
} from "../news/store";
import { toStoredArticles } from "../news/ingest";

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(ts);
  }
}

export default function NewsScreen({ theme }: { theme: ThemeConfig }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<NewsReaderCategoryFilter>("All");
  const [articles, setArticles] = useState<StoredNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StoredNewsArticle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshLocal = useCallback(async () => {
    try {
      const rows = await listNewsArticles();
      setArticles(rows);
    } catch {
      /* offline / idb */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refreshLocal();
        const fetched = await fetchNewsHeadlines();
        if (cancelled) return;
        if (fetched.items?.length) {
          await upsertNewsArticles(toStoredArticles(fetched.items));
          await refreshLocal();
        }
        setError(null);
      } catch {
        if (!cancelled) {
          // Offline path: keep local store readable
          setError(null);
          await refreshLocal();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshLocal]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const row = await getNewsArticle(selectedId);
      if (!cancelled) setDetail(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const searched = searchNewsArticles(articles, query);
  const results =
    category === "All"
      ? searched
      : searched.filter((a) => categoryOf(a.title) === category);
  const searching = query.trim().length > 0;

  if (detail) {
    return (
      <section
        data-testid="v2-news-detail"
        className={`flex flex-col gap-3 p-4 ${theme.text}`}
      >
        <button
          type="button"
          className={btnClass({ theme, variant: "ghost", size: "md" })}
          onClick={() => setSelectedId(null)}
        >
          ← News
        </button>
        <h2 className={`text-base font-bold ${theme.primary}`}>{detail.title}</h2>
        <div className={`text-[11px] ${theme.muted}`} data-testid="v2-news-source">
          {detail.sourceName} · {formatTime(detail.publishedAt)}
        </div>
        <p className="text-sm leading-relaxed">{detail.body || detail.summary}</p>
        {detail.url ? (
          <a
            href={detail.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline text-sm ${theme.primary} min-h-[44px] inline-flex items-center ${BTN_TOUCH}`}
          >
            Open source
          </a>
        ) : null}
      </section>
    );
  }

  return (
    <section data-testid="v2-news" className={`flex flex-col gap-3 p-4 ${theme.text}`}>
      <h1 className={`text-lg font-bold ${theme.primary}`}>News</h1>
      {/*
        Category chips — horizontal scroll on ~390 so DeFi+ stay reachable
        (PR-A / Frank regression lock; mirrors V1 NewsReader taxonomy).
      */}
      <div
        role="tablist"
        aria-label="News categories"
        data-testid="v2-news-category-tabs"
        className="flex items-center gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
      >
        {NEWS_READER_CATEGORIES.map((pill) => {
          const active = category === pill;
          return (
            <button
              key={pill}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`v2-news-cat-${pill.toLowerCase()}`}
              onClick={() => setCategory(pill)}
              className={`shrink-0 min-h-[44px] px-3 text-[10px] uppercase tracking-widest whitespace-nowrap border ${theme.rounded} ${BTN_TOUCH} ${
                active
                  ? "font-bold border-transparent"
                  : `${theme.border} ${theme.muted} bg-transparent`
              }`}
              style={
                active
                  ? { background: theme.phosphor, color: "#000" }
                  : undefined
              }
            >
              {pill}
            </button>
          );
        })}
        <span
          aria-hidden
          className="shrink-0 w-3 h-11"
          data-testid="v2-news-cat-scroll-pad"
        />
      </div>
      <label className={`${fieldLabelClass()} text-[10px]`}>
        <span className={`uppercase tracking-widest ${theme.muted}`}>
          Search local archive
        </span>
        <input
          data-testid="v2-news-search"
          className={fieldClass({ theme })}
          placeholder="Search titles, sources…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {loading && (
        <p className={theme.muted} data-testid="v2-news-loading">
          Loading…
        </p>
      )}
      {error && <p className={theme.warn}>{error}</p>}

      {searching && (
        <p className={`text-[11px] ${theme.muted}`} data-testid="v2-news-query-echo">
          Results for “{query.trim()}”
        </p>
      )}

      {!loading && results.length === 0 ? (
        <p className={theme.muted} data-testid="v2-news-empty">
          {searching ? "No matching news." : "No news accumulated yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1" data-testid="v2-news-list">
          {results.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={`w-full text-left min-h-[44px] px-3 py-2 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${BTN_TOUCH}`}
                onClick={() => setSelectedId(a.id)}
              >
                <div className={`font-bold text-sm ${theme.primary}`}>
                  {a.title}
                </div>
                <div className={`text-[11px] ${theme.muted}`}>
                  {a.sourceName} · {formatTime(a.publishedAt)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
