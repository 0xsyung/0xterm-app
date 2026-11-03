/**
 * @file PnlScreen.tsx
 * @description V2 PnL P1–P4 (#295)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useMemo, useState } from "react";
import type { ThemeConfig } from "@/components/terminal/types";
import { BTN_TOUCH, btnClass } from "@/components/terminal/ui/buttonClasses";
import { V2_PNL_PERIODS, type V2PnlPeriod } from "../nav";
import { useV2 } from "../V2Context";

export type V2PnlSummary = {
  unrealizedUsd: number | null;
  realizedUsd: number | null;
  totalUsd: number | null;
};

export type V2CostBasisRow = {
  symbol: string;
  qty: string;
  avgCostUsd: number | null;
  markUsd: number | null;
  unrealizedUsd: number | null;
};

export type V2PnlHistoryRow = {
  id: string;
  time: string;
  type: string;
  asset: string;
  qty: string;
  usd: number | null;
  txUrl?: string;
};

function formatUsd(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  })}`;
}

export default function PnlScreen({
  theme,
  isConnected,
  summary,
  costBasis,
  history,
  onConnect
}: {
  theme: ThemeConfig;
  isConnected: boolean;
  summary: V2PnlSummary;
  costBasis: V2CostBasisRow[];
  history: V2PnlHistoryRow[];
  onConnect: () => void;
}) {
  const { setNav } = useV2();
  const [period, setPeriod] = useState<V2PnlPeriod>("All");
  const [view, setView] = useState<"summary" | "basis" | "history">("summary");

  const empty = useMemo(
    () =>
      summary.totalUsd == null &&
      costBasis.length === 0 &&
      history.length === 0,
    [summary, costBasis, history]
  );

  if (!isConnected) {
    return (
      <section data-testid="v2-pnl" className={`flex flex-col gap-4 p-4 ${theme.text}`}>
        <h1 className={`text-lg font-bold ${theme.primary}`}>PnL</h1>
        <p className={theme.muted}>
          Connect to track cost basis, realized and unrealized PnL in USD.
        </p>
        <button
          type="button"
          data-testid="v2-pnl-connect"
          onClick={onConnect}
          className={btnClass({ theme, variant: "primary", size: "lg", block: true })}
          style={{ background: theme.phosphor, color: "#000" }}
        >
          Connect
        </button>
      </section>
    );
  }

  return (
    <section data-testid="v2-pnl" className={`flex flex-col gap-3 p-4 ${theme.text}`}>
      <div className="flex items-center justify-between gap-2">
        <h1 className={`text-lg font-bold ${theme.primary}`}>PnL</h1>
        <button
          type="button"
          className={btnClass({ theme, variant: "ghost", size: "md" })}
          onClick={() => setNav("holdings")}
          data-testid="v2-pnl-to-holdings"
        >
          Holdings
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto" data-testid="v2-pnl-periods">
        {V2_PNL_PERIODS.map((p) => {
          const active = period === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              onClick={() => setPeriod(p)}
              className={`shrink-0 min-h-[44px] px-3 text-[10px] uppercase tracking-widest border ${theme.rounded} ${BTN_TOUCH} ${
                active
                  ? "font-bold border-transparent"
                  : `${theme.border} ${theme.muted}`
              }`}
              style={
                active
                  ? { background: theme.phosphor, color: "#000" }
                  : undefined
              }
            >
              {p}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1" role="tablist" aria-label="PnL views">
        {(
          [
            ["summary", "Summary"],
            ["basis", "Cost basis"],
            ["history", "History"]
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            data-testid={`v2-pnl-view-${id}`}
            onClick={() => setView(id)}
            className={btnClass({
              theme,
              variant: view === id ? "primary" : "secondary",
              size: "md"
            })}
            style={
              view === id
                ? { background: theme.phosphor, color: "#000" }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>

      {empty ? (
        <p className={theme.muted} data-testid="v2-pnl-empty">
          No PnL history yet.
        </p>
      ) : view === "summary" ? (
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-2`}
          data-testid="v2-pnl-summary"
        >
          {(
            [
              ["Unrealized", summary.unrealizedUsd],
              ["Realized", summary.realizedUsd],
              ["Total", summary.totalUsd]
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className={`border ${theme.border} ${theme.cardBg} ${theme.rounded} p-3`}
            >
              <div className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>
                {label}
              </div>
              <div
                className={`text-lg font-bold tabular-nums ${
                  value != null && value < 0 ? theme.warn : theme.primary
                }`}
              >
                {formatUsd(value)}
              </div>
            </div>
          ))}
        </div>
      ) : view === "basis" ? (
        <ul className="flex flex-col gap-1" data-testid="v2-pnl-basis">
          {costBasis.length === 0 ? (
            <p className={theme.muted}>No cost basis rows yet.</p>
          ) : (
            costBasis.map((row) => (
              <li
                key={row.symbol}
                className={`border ${theme.border} ${theme.cardBg} ${theme.rounded} p-3 min-h-[44px]`}
              >
                <div className="flex justify-between gap-2">
                  <span className={`font-bold ${theme.primary}`}>{row.symbol}</span>
                  <span className="tabular-nums">{formatUsd(row.unrealizedUsd)}</span>
                </div>
                <div className={`text-[11px] ${theme.muted}`}>
                  qty {row.qty} · avg {formatUsd(row.avgCostUsd)} · mark{" "}
                  {formatUsd(row.markUsd)}
                </div>
                <div className={`text-[10px] mt-1 ${theme.muted}`}>
                  Basis from on-platform fills and recorded snapshots.
                </div>
              </li>
            ))
          )}
        </ul>
      ) : (
        <ul className="flex flex-col gap-1" data-testid="v2-pnl-history">
          {history.length === 0 ? (
            <p className={theme.muted}>No ledger rows yet.</p>
          ) : (
            history.map((row) => (
              <li
                key={row.id}
                className={`border ${theme.border} ${theme.cardBg} ${theme.rounded} p-3`}
              >
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-bold">
                    {row.type} · {row.asset}
                  </span>
                  <span className="tabular-nums">{formatUsd(row.usd)}</span>
                </div>
                <div className={`text-[11px] ${theme.muted}`}>
                  {row.time} · {row.qty}
                  {row.txUrl ? (
                    <>
                      {" · "}
                      <a
                        href={row.txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        tx
                      </a>
                    </>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
