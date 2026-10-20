/**
 * @file PortfolioPanel.tsx
 * @description Merged INVEST PORTFOLIO panel — holdings + baseline + P/L summary (#253)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ThemeConfig } from "../types";
import PortfolioWidget, {
  type PortfolioGroup,
  type PortfolioHolding,
  type SnapshotHolding
} from "../widgets/PortfolioWidget";
import { INVEST_PANEL_CHAT_GUTTER_CLASS } from "../widgets/floatingChatLayout";
import {
  formatPnlPct,
  formatPnlUsdSigned
} from "../pnl";
import { computePnl, pnlPricePct } from "../pnlMath";

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

/** Baseline writer result — same shape as former SnapshotPanel. */
export type SnapshotRecordArgs = {
  label: string;
};

export type SnapshotRecordResult =
  | { ok: true; label: string; count: number; time: string }
  | { ok: false; error: string };

export type BaselineResetResult =
  | { ok: true; label: string; count: number; time: string }
  | { ok: false; error: string };

const NO_SNAPSHOT_BANNER =
  "NO SNAPSHOT — record one below to track P/L";

const EMPTY_GATE =
  "No snapshot yet. Use LABEL + RECORD SNAPSHOT below to establish a P/L baseline.";

export default function PortfolioPanel({
  theme,
  onClose,
  onFetch,
  surface = "invest",
  onRecordSnapshot,
  onResetBaseline,
  refreshKey = 0,
  isConnected = false,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onFetch: () => Promise<PortfolioFetchResult>;
  surface?: PortfolioSurface;
  /** INVEST-only: write portfolioSnapshot prefs. Hidden on forensic. */
  onRecordSnapshot?: (args: SnapshotRecordArgs) => Promise<SnapshotRecordResult>;
  /** INVEST-only: two-click confirm re-write baseline. Hidden on forensic. */
  onResetBaseline?: (args: SnapshotRecordArgs) => Promise<BaselineResetResult>;
  refreshKey?: number;
  isConnected?: boolean;
  frameless?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortfolioFetchSuccess | null>(null);
  const [label, setLabel] = useState("now");
  const [baselineBusy, setBaselineBusy] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [baselineSuccess, setBaselineSuccess] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

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

  const summary = useMemo(() => {
    if (!hasSnapshot || !data?.holdings || !data.snapshot) return null;
    return computePnl(data.holdings, data.snapshot);
  }, [hasSnapshot, data]);

  const pct =
    summary != null ? pnlPricePct(summary.pnlPrice, summary.snapNav) : null;

  const deltaClass = (n: number | null) => {
    if (n === null || n === undefined || !Number.isFinite(n)) return theme.muted;
    if (n < 0) return theme.warn || theme.muted;
    return theme.primary;
  };

  const formatNet = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return "—";
    return `$${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const baselineLabel = () => label.trim() || "now";

  const handleRecord = async () => {
    if (!onRecordSnapshot) return;
    if (!isConnected) {
      setBaselineError("Wallet not connected.");
      setBaselineSuccess(null);
      return;
    }
    if (baselineBusy || !label.trim()) return;
    setBaselineError(null);
    setBaselineSuccess(null);
    setConfirmReset(false);
    setBaselineBusy(true);
    try {
      const res = await onRecordSnapshot({ label: baselineLabel() });
      if (res.ok) {
        setBaselineSuccess(
          `[✓] Snapshot "${res.label}" saved (${res.count} holdings) at ${res.time}.`
        );
        await fetchView();
      } else {
        setBaselineError(res.error);
      }
    } catch (err: unknown) {
      setBaselineError(err instanceof Error ? err.message : String(err));
    } finally {
      setBaselineBusy(false);
    }
  };

  const handleReset = async () => {
    if (!onResetBaseline || !isConnected) return;
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    setBaselineError(null);
    setBaselineSuccess(null);
    setBaselineBusy(true);
    try {
      const res = await onResetBaseline({ label: baselineLabel() });
      if (res.ok) {
        setBaselineSuccess(
          `[✓] Baseline reset to "${res.label}" (${res.count} holdings) at ${res.time}.`
        );
        await fetchView();
      } else {
        setBaselineError(res.error);
      }
    } catch (err: unknown) {
      setBaselineError(err instanceof Error ? err.message : String(err));
    } finally {
      setBaselineBusy(false);
    }
  };

  const showBaseline = surface === "invest" && !!onRecordSnapshot;
  // Soft ACK B: forensic = holdings + REFRESH only (read-only banner OK).
  const showSummary = surface === "invest" && hasSnapshot && summary != null;

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
        className={`text-[9px] uppercase ${theme.muted}`}
        data-testid="portfolio-snapshot-banner"
      >
        {snapshotBanner}
      </div>

      {showSummary && (
        <div
          className={`space-y-0.5 tabular-nums text-[11px] border ${theme.border} p-2 ${theme.cardBg}`}
          data-testid="portfolio-summary"
        >
          <div className="flex justify-between gap-2">
            <span className={`${theme.muted} uppercase text-[9px]`}>NET USD</span>
            <span className={summary.netUsd === null ? theme.muted : theme.text}>
              {formatNet(summary.netUsd)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className={`${theme.muted} uppercase text-[9px]`}>P/L (PRICE)</span>
            <span className={deltaClass(summary.pnlPrice)}>
              {formatPnlUsdSigned(summary.pnlPrice)}
              <span
                className={`ml-1 ${
                  pct === null ? theme.muted : deltaClass(summary.pnlPrice)
                }`}
              >
                ({formatPnlPct(pct)})
              </span>
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className={`${theme.muted} uppercase text-[9px]`}>BAL Δ</span>
            <span className={deltaClass(summary.pnlBalance)}>
              {formatPnlUsdSigned(summary.pnlBalance)}
            </span>
          </div>
        </div>
      )}

      {surface === "invest" && !hasSnapshot && !running && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="portfolio-empty-gate"
          role="status"
        >
          {EMPTY_GATE}
        </div>
      )}

      {showBaseline && (
        <div
          className="flex flex-col gap-2"
          data-testid="portfolio-baseline"
        >
          <label className="flex flex-col gap-1">
            <span className={`uppercase text-[9px] ${theme.muted}`}>LABEL</span>
            <input
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setConfirmReset(false);
              }}
              placeholder="now / snapshot-…"
              className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
              data-testid="portfolio-baseline-label"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <button
            type="button"
            onClick={() => void handleRecord()}
            aria-disabled={
              !isConnected || baselineBusy || !label.trim() || running
            }
            className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer ${
              !isConnected || baselineBusy || !label.trim() || running
                ? "opacity-40"
                : ""
            } ${touch}`}
            style={{ background: theme.phosphor, color: "#000000" }}
            data-testid="portfolio-record-snapshot"
          >
            {baselineBusy ? "…" : "RECORD SNAPSHOT"}
          </button>

          {onResetBaseline && (
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={!isConnected || baselineBusy || running}
              className={`w-full uppercase tracking-widest text-[10px] font-bold border ${theme.border} bg-transparent cursor-pointer ${theme.warn || theme.primary} ${
                !isConnected || baselineBusy || running ? "opacity-40" : ""
              } ${touch}`}
              data-testid="portfolio-reset-baseline"
            >
              {confirmReset ? "CONFIRM RESET BASELINE" : "RESET BASELINE"}
            </button>
          )}

          {baselineError && (
            <div
              className={`text-[10px] ${theme.warn || theme.muted}`}
              data-testid="portfolio-baseline-error"
              role="alert"
            >
              {baselineError}
            </div>
          )}
          {baselineSuccess && (
            <div
              className={`text-[10px] ${theme.primary}`}
              data-testid="portfolio-baseline-success"
              role="status"
            >
              {baselineSuccess}
            </div>
          )}
        </div>
      )}

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
