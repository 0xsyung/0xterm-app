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
  fetchNewsHeadlines,
  type NewsItem
} from "@/components/terminal/news";
import {
  getNewsArticle,
  listNewsArticles,
  searchNewsArticles,
  upsertNewsArticles,
  type StoredNewsArticle
} from "../news/store";

function toStored(items: NewsItem[]): Omit<
  StoredNewsArticle,
  "searchText" | "ingestedAt"
>[] {
  return items.map((it) => ({
    id: it.id,
    title: it.title,
    summary: it.title,
    body: it.title,
    sourceName: it.sourceId,
    url: it.url,
    publishedAt: it.publishedAt || Date.now()
  }));
}

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
          await upsertNewsArticles(toStored(fetched.items));
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

  const results = searchNewsArticles(articles, query);
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
      <label className="flex flex-col gap-1">
        <span className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>
          Search local archive
        </span>
        <input
          data-testid="v2-news-search"
          className={`min-h-[44px] px-3 border ${theme.border} ${theme.bg} ${theme.text} ${theme.rounded}`}
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
