/**
 * @file HoldingsScreen.tsx
 * @description V2 Holdings H1–H4 (#295)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useMemo, useState } from "react";
import type { ThemeConfig } from "@/components/terminal/types";
import { BTN_TOUCH, btnClass } from "@/components/terminal/ui/buttonClasses";
import {
  V2_CHAIN_CHIPS,
  type V2ChainChipId
} from "../nav";
import { useV2 } from "../V2Context";

export type V2HoldingRow = {
  symbol: string;
  chainId: number;
  chainLabel: string;
  qty: string;
  valueUsd: number | null;
  change24h: number | null;
  pctOfPortfolio: number | null;
};

function formatUsd(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
}

function formatPct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function HoldingsScreen({
  theme,
  isConnected,
  holdings,
  onConnect
}: {
  theme: ThemeConfig;
  isConnected: boolean;
  holdings: V2HoldingRow[];
  onConnect: () => void;
}) {
  const { goTrade } = useV2();
  const [chip, setChip] = useState<V2ChainChipId>("all");
  const [selected, setSelected] = useState<V2HoldingRow | null>(null);
  const [showPositions, setShowPositions] = useState(false);

  const filtered = useMemo(() => {
    if (chip === "all") return holdings;
    const meta = V2_CHAIN_CHIPS.find((c) => c.id === chip);
    if (!meta || !("chainId" in meta)) return holdings;
    return holdings.filter((h) => h.chainId === meta.chainId);
  }, [holdings, chip]);

  const totalUsd = useMemo(
    () =>
      filtered.reduce(
        (acc, h) => acc + (h.valueUsd != null ? h.valueUsd : 0),
        0
      ),
    [filtered]
  );

  const change24h = useMemo(() => {
    const priced = filtered.filter((h) => h.change24h != null && h.valueUsd != null);
    if (!priced.length) return null;
    const w = priced.reduce((a, h) => a + (h.valueUsd || 0), 0);
    if (w <= 0) return null;
    return priced.reduce(
      (a, h) => a + ((h.change24h || 0) * (h.valueUsd || 0)) / w,
      0
    );
  }, [filtered]);

  if (!isConnected) {
    return (
      <section
        data-testid="v2-holdings"
        className={`flex flex-col gap-4 p-4 ${theme.text}`}
      >
        <h1 className={`text-lg font-bold ${theme.primary}`}>Holdings</h1>
        <p className={theme.muted}>
          Connect a wallet to view unified multi-chain balances in USD.
        </p>
        <button
          type="button"
          data-testid="v2-holdings-connect"
          onClick={onConnect}
          className={btnClass({ theme, variant: "primary", size: "lg", className: "self-start w-fit" })}
          style={{ background: theme.phosphor, color: "#000" }}
        >
          Connect
        </button>
      </section>
    );
  }

  if (selected) {
    return (
      <section
        data-testid="v2-holdings-detail"
        className={`flex flex-col gap-3 p-4 ${theme.text}`}
      >
        <button
          type="button"
          className={btnClass({ theme, variant: "ghost", size: "md" })}
          onClick={() => setSelected(null)}
        >
          ← Back
        </button>
        <h2 className={`text-base font-bold ${theme.primary}`}>
          {selected.symbol}
        </h2>
        <p className={`text-sm ${theme.muted}`}>
          {selected.chainLabel} · {selected.qty} · {formatUsd(selected.valueUsd)}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["send", "receive", "swap"] as const).map((action) => (
            <button
              key={action}
              type="button"
              data-testid={`v2-holding-action-${action}`}
              className={btnClass({
                theme,
                variant: "secondary",
                size: "lg",
                className: "capitalize min-h-[44px]"
              })}
              onClick={() =>
                goTrade({
                  action,
                  symbol: selected.symbol,
                  chainId: selected.chainId
                })
              }
            >
              {action}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (showPositions) {
    return (
      <section
        data-testid="v2-holdings-positions"
        className={`flex flex-col gap-3 p-4 ${theme.text}`}
      >
        <button
          type="button"
          className={btnClass({ theme, variant: "ghost", size: "md" })}
          onClick={() => setShowPositions(false)}
        >
          ← Back
        </button>
        <h2 className={`text-base font-bold ${theme.primary}`}>Positions</h2>
        <p className={theme.muted} data-testid="v2-positions-empty">
          No open positions.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="v2-holdings"
      className={`flex flex-col gap-3 p-4 min-h-0 ${theme.text}`}
    >
      <div
        className="flex flex-col items-start gap-2"
        data-testid="v2-holdings-header"
      >
        <div>
          <div className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>
            Portfolio
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${theme.primary}`}
            data-testid="v2-holdings-total"
          >
            {formatUsd(totalUsd)}
          </div>
          <div
            className={`text-sm tabular-nums ${
              change24h != null && change24h < 0 ? theme.warn : theme.primary
            }`}
            data-testid="v2-holdings-change"
          >
            24h {formatPct(change24h)}
          </div>
        </div>
        <button
          type="button"
          data-testid="v2-holdings-positions-link"
          className={btnClass({
            theme,
            variant: "secondary",
            size: "md",
            className: "self-start w-fit min-h-[44px]"
          })}
          onClick={() => setShowPositions(true)}
        >
          Positions
        </button>
      </div>

      <div
        className="flex gap-1 overflow-x-auto [scrollbar-width:none]"
        data-testid="v2-chain-chips"
        role="group"
        aria-label="Chain filter"
      >
        {V2_CHAIN_CHIPS.map((c) => {
          const active = chip === c.id;
          return (
            <button
              key={c.id}
              type="button"
              data-testid={`v2-chain-chip-${c.id}`}
              aria-pressed={active}
              onClick={() => setChip(c.id)}
              className={`shrink-0 min-h-[44px] px-3 text-[10px] uppercase tracking-widest border ${theme.rounded} ${BTN_TOUCH} ${
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
              {c.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className={theme.muted} data-testid="v2-holdings-empty">
          No assets match this filter.
        </p>
      ) : (
        <ul className="flex flex-col gap-1" data-testid="v2-holdings-list">
          {filtered.map((h) => (
            <li key={`${h.chainId}-${h.symbol}`}>
              <button
                type="button"
                className={`w-full text-left min-h-[44px] px-3 py-2 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${BTN_TOUCH}`}
                onClick={() => setSelected(h)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`font-bold text-sm ${theme.primary}`}>
                      {h.symbol}{" "}
                      <span className={`text-[10px] ${theme.muted}`}>
                        {h.chainLabel}
                      </span>
                    </div>
                    <div className={`text-[11px] tabular-nums ${theme.muted}`}>
                      {h.qty}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm tabular-nums font-bold">
                      {formatUsd(h.valueUsd)}
                    </div>
                    <div className={`text-[10px] ${theme.muted}`}>
                      {h.pctOfPortfolio != null
                        ? `${h.pctOfPortfolio.toFixed(1)}%`
                        : "—"}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
