/**
 * @file NewsScreen.tsx
 * @description V2 News editorial reader in Finance chrome (#323)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeConfig } from "@/components/terminal/types";
import { BTN_TOUCH } from "@/components/terminal/ui/buttonClasses";
import {
  fieldClass,
  fieldLabelClass
} from "@/components/terminal/ui/fieldClasses";
import {
  NEWS_READER_CATEGORIES,
  categoryOf,
  estimateReadTime,
  fetchNewsHeadlines,
  formatNewsAsOf,
  formatNewsEditorialDate,
  newsThumbStyle,
  type NewsReaderCategoryFilter
} from "@/components/terminal/news";
import {
  getNewsMeta,
  listNewsArticles,
  searchNewsArticles,
  upsertNewsArticles,
  type StoredNewsArticle
} from "../news/store";
import { toStoredArticles } from "../news/ingest";

function Thumb({
  sourceName,
  theme,
  imageUrl
}: {
  sourceName: string;
  theme: ThemeConfig;
  imageUrl?: string | null;
}) {
  const thumb = newsThumbStyle(sourceName, theme);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);
  const showImg = Boolean(imageUrl) && !imgFailed;
  const monogram = (
    <span
      data-testid="v2-news-thumb-monogram"
      className="font-bold text-lg tracking-wider select-none"
      style={{ color: thumb.monogramColor }}
    >
      {thumb.monogram}
    </span>
  );
  if (!showImg) {
    return (
      <div
        className={`relative w-full max-w-full aspect-video border ${theme.border} overflow-hidden flex items-center justify-center`}
        style={{ background: thumb.background }}
        aria-hidden
        data-testid="v2-news-thumb"
        data-thumb="monogram"
      >
        {monogram}
      </div>
    );
  }
  return (
    <div
      className={`relative w-full max-w-full aspect-video border ${theme.border} ${theme.cardBg} p-1`}
      aria-hidden
      data-testid="v2-news-thumb"
      data-thumb="image"
    >
      <div
        className="relative w-full h-full overflow-hidden flex items-center justify-center"
        style={{ background: thumb.background }}
      >
        {monogram}
        <img
          src={imageUrl as string}
          alt=""
          className="absolute inset-0 w-full h-full max-w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    </div>
  );
}

function NewsCard({
  article,
  theme,
  variant
}: {
  article: StoredNewsArticle;
  theme: ThemeConfig;
  variant: "lead" | "supporting" | "more";
}) {
  const cat = categoryOf(article.title);
  const mins = estimateReadTime(article);
  const titleClass =
    variant === "lead"
      ? "text-base font-bold leading-snug line-clamp-3"
      : "text-sm font-bold leading-snug line-clamp-2";
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="v2-news-card"
      data-variant={variant}
      className={`block w-full min-h-[44px] p-3 space-y-1.5 text-left border ${theme.border} ${theme.cardBg} ${theme.rounded} outline-none focus-visible:shadow-[0_0_0_1px_rgba(110,231,183,0.12)]`}
    >
      <Thumb
        sourceName={article.sourceName}
        theme={theme}
        imageUrl={article.imageUrl || null}
      />
      <span
        className={`inline-block uppercase text-[10px] px-1.5 py-0.5 border ${theme.border} ${theme.muted} tracking-wide`}
        data-testid="v2-news-card-tag"
      >
        {cat}
      </span>
      <div className={titleClass}>{article.title}</div>
      <div
        className={`text-[11px] ${theme.muted} tabular-nums`}
        data-testid="v2-news-card-meta"
      >
        {`${formatNewsEditorialDate(article.publishedAt)} · ${mins} min read`}
      </div>
    </a>
  );
}

export default function NewsScreen({ theme }: { theme: ThemeConfig }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<NewsReaderCategoryFilter>("All");
  const [articles, setArticles] = useState<StoredNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  const refreshLocal = useCallback(async () => {
    try {
      const rows = await listNewsArticles();
      setArticles(rows);
      try {
        const meta = await getNewsMeta();
        if (meta.lastIngestAt) setAsOf(meta.lastIngestAt);
      } catch {
        /* meta optional */
      }
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

  const searched = searchNewsArticles(articles, query);
  const results =
    category === "All"
      ? searched
      : searched.filter((a) => categoryOf(a.title) === category);
  const searching = query.trim().length > 0;
  const lead = results[0];
  const supporting = results.slice(1, 3);
  const more = results.slice(3);

  return (
    <section
      data-testid="v2-news"
      className={`flex flex-col gap-3 p-4 items-start ${theme.text}`}
    >
      <header
        data-testid="v2-news-masthead"
        className="flex flex-col items-start gap-1 w-full"
      >
        <h1 className={`text-lg font-bold ${theme.font}`}>
          <span className={theme.primary}>0xTERM</span>
          <span className={`${theme.muted} font-normal`}> research</span>
        </h1>
        <p
          data-testid="v2-news-as-of"
          className={`text-[11px] ${theme.muted} tabular-nums`}
        >
          as of {formatNewsAsOf(asOf)}
        </p>
      </header>
      {/*
        Category chips — horizontal scroll on ~390 so DeFi+ stay reachable
        (PR-A / Frank regression lock; mirrors V1 NewsReader taxonomy).
      */}
      <div
        role="tablist"
        aria-label="News categories"
        data-testid="v2-news-category-tabs"
        className="flex items-center gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin] w-full min-w-0"
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
      <label
        className={fieldLabelClass()}
        data-testid="v2-news-search-label"
      >
        <span className={theme.muted}>Search local archive</span>
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
      ) : results.length > 0 ? (
        <div className="flex flex-col gap-4 w-full" data-testid="v2-news-list">
          {lead && (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
              <div className="min-h-0" data-testid="v2-news-lead">
                <NewsCard article={lead} theme={theme} variant="lead" />
              </div>
              {supporting.length > 0 && (
                <div
                  data-testid="v2-news-supporting"
                  className={
                    supporting.length === 1
                      ? "grid grid-cols-1 gap-2"
                      : "grid grid-cols-2 gap-2 md:grid-cols-1"
                  }
                >
                  {supporting.map((it) => (
                    <NewsCard
                      key={it.id}
                      article={it}
                      theme={theme}
                      variant="supporting"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {more.length > 0 && (
            <div data-testid="v2-news-more" className="space-y-2">
              <div
                className={`text-[11px] uppercase tracking-widest ${theme.muted} border-b ${theme.border} pb-1`}
              >
                MORE
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {more.map((it) => (
                  <NewsCard
                    key={it.id}
                    article={it}
                    theme={theme}
                    variant="more"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
