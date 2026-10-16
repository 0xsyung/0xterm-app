/**
 * @file PortfolioPanel.tsx
 * @description Shared PORTFOLIO panel — INVEST + FORENSIC READ (#167)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeConfig } from "../types";
import PortfolioWidget, {
  type PortfolioGroup,
  type PortfolioHolding,
  type SnapshotHolding
} from "../widgets/PortfolioWidget";
import { INVEST_PANEL_CHAT_GUTTER_CLASS } from "../widgets/floatingChatLayout";

export type PortfolioSurface = "invest" | "forensic";

export type PortfolioFetchSuccess = {
  holdings: PortfolioHolding[];
  hiddenCount?: number;
  groups?: PortfolioGroup[];
  snapshot?: Record<string, SnapshotHolding>;
  snapshotLabel?: string;
  snapshotTime?: number;
};

export type PortfolioFetchResult =
  | { ok: true; data: PortfolioFetchSuccess }
  | { ok: false; error: string };

const NO_SNAPSHOT_BANNER =
  "NO SNAPSHOT — record one from INVEST → SNAPSHOT to track P/L";

export default function PortfolioPanel({
  theme,
  onClose,
  onFetch,
  surface = "invest",
  onRecordSnapshot,
  refreshKey = 0,
  isConnected = false,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onFetch: () => Promise<PortfolioFetchResult>;
  surface?: PortfolioSurface;
  /** INVEST-only: open SNAPSHOT panel or run confirm. Hidden on forensic. */
  onRecordSnapshot?: () => void;
  refreshKey?: number;
  isConnected?: boolean;
  frameless?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortfolioFetchSuccess | null>(null);

  const fetchView = useCallback(async () => {
    if (!isConnected) {
      setError("Wallet not connected.");
      setData(null);
      return;
    }
    setError(null);
    setRunning(true);
    try {
      const res = await onFetch();
      if (res.ok) {
        setData(res.data);
      } else {
        setData(null);
        setError(res.error);
      }
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [isConnected, onFetch]);

  useEffect(() => {
    void fetchView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

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

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  const hasSnapshot =
    !!data?.snapshot && Object.keys(data.snapshot).length > 0;
  const snapshotBanner = hasSnapshot
    ? `SNAPSHOT: ${data?.snapshotLabel || "untitled"} · ${
        data?.snapshotTime ? new Date(data.snapshotTime).toLocaleString() : ""
      }`
    : NO_SNAPSHOT_BANNER;

  return (
    <div
      className={`w-full flex flex-col gap-3 ${INVEST_PANEL_CHAT_GUTTER_CLASS} ${
        frameless
          ? ""
          : `max-w-[640px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="portfolio-panel"
      data-surface={surface}
      role="dialog"
      aria-label="Portfolio"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          PORTFOLIO
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close portfolio panel"
          className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${touch}`}
          data-testid="portfolio-panel-close"
        >
          ×
        </button>
      </div>

      <div className={`text-[9px] ${theme.muted}`}>
        Read-only multi-chain holdings — never sends.
      </div>

      <button
        type="button"
        onClick={() => void fetchView()}
        aria-disabled={running || !isConnected}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer ${
          running || !isConnected ? "opacity-40" : ""
        } ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="portfolio-refresh"
      >
        {running ? "…" : "REFRESH"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="portfolio-preview"
      >
        portfolio
      </div>

      {surface === "invest" && onRecordSnapshot && (
        <button
          type="button"
          onClick={onRecordSnapshot}
          disabled={!isConnected}
          className={`w-full uppercase tracking-widest text-[10px] font-bold border ${theme.border} bg-transparent cursor-pointer ${theme.primary} ${
            !isConnected ? "opacity-40" : ""
          } ${touch}`}
          data-testid="portfolio-record-snapshot"
        >
          RECORD SNAPSHOT
        </button>
      )}

      <div
        className={`text-[9px] uppercase ${theme.muted}`}
        data-testid="portfolio-snapshot-banner"
      >
        {snapshotBanner}
      </div>

      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="portfolio-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {!error && !running && data && data.holdings.length === 0 && (
        <div
          className={`text-[10px] ${theme.muted}`}
          data-testid="portfolio-empty"
        >
          No holdings found.
        </div>
      )}

      {data && data.holdings.length > 0 && (
        <div data-testid="portfolio-body" className="-my-3">
          <PortfolioWidget
            holdings={data.holdings}
            snapshot={data.snapshot}
            snapshotLabel={data.snapshotLabel}
            snapshotTime={data.snapshotTime}
            theme={theme}
            fetching={running}
            groups={data.groups}
            hiddenCount={data.hiddenCount}
            pinned
          />
        </div>
      )}

      {running && !data && (
        <div className={`text-[10px] ${theme.muted}`} data-testid="portfolio-fetching">
          Fetching balances across chains…
        </div>
      )}
    </div>
  );
}
