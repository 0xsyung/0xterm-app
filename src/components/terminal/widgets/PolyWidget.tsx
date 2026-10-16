/**
 * @file PolyWidget.tsx
 * @description Polymarket list/show/positions/orders — pinnable Vault-density (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React from "react";
import type { ThemeConfig } from "../types";
import PinButton from "./PinButton";
import type { GammaMarket } from "../poly/gamma";
import { truncateAddr } from "../poly";

export type PolyWidgetMode = "list" | "show" | "positions" | "orders" | "status";

export type PolyPositionRow = {
  market: string;
  outcome: string;
  size: string;
  avgPrice: string;
  value: string;
};

export type PolyOrderRow = {
  id: string;
  market: string;
  side: string;
  price: string;
  size: string;
  status: string;
  tif?: string;
};

export type PolyStatusData = {
  chainOk: boolean;
  chainLabel: string;
  pusd: string;
  usdce: string;
  allowance: string;
  spender: string;
  clobSession: boolean;
};

type PolyWidgetProps = {
  mode: PolyWidgetMode;
  theme: ThemeConfig;
  query?: string;
  markets?: GammaMarket[];
  market?: GammaMarket;
  book?: {
    bestBid: number | null;
    bestAsk: number | null;
    tickSize: number;
    minOrderSize: number;
    negRisk: boolean;
    feeEstimate?: string;
  };
  positions?: PolyPositionRow[];
  orders?: PolyOrderRow[];
  status?: PolyStatusData;
  moreCount?: number;
  onPin?: () => void;
  pinned?: boolean;
};

function fmtOdds(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function fmtVol(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function shortQ(q: string, n = 48): string {
  const t = (q || "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export default function PolyWidget({
  mode,
  theme,
  query,
  markets,
  market,
  book,
  positions,
  orders,
  status,
  moreCount,
  onPin,
  pinned
}: PolyWidgetProps) {
  return (
    <div
      className={`relative group my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} text-xs w-full overflow-x-auto`}
    >
      {!pinned && onPin && (
        <PinButton
          onPin={onPin}
          theme={theme}
          className="absolute -top-1 -right-1 z-10 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
        />
      )}

      {mode === "status" && status && (
        <>
          <div
            className={`flex justify-between items-center ${theme.text}/70 border-b ${theme.border} pb-1`}
          >
            <span className="font-bold">POLY STATUS</span>
            <span className="uppercase">{status.chainLabel}</span>
          </div>
          <div className={`grid grid-cols-2 gap-2 mt-2 ${theme.text} font-mono tabular-nums`}>
            <div>
              <div className={`text-[10px] ${theme.muted}`}>CHAIN</div>
              <div className={status.chainOk ? theme.primary : theme.warn}>
                {status.chainOk ? "Polygon 137" : "Not Polygon — refuse trades"}
              </div>
            </div>
            <div>
              <div className={`text-[10px] ${theme.muted}`}>CLOB SESSION</div>
              <div>{status.clobSession ? "L2 derived" : "none (sign on first trade)"}</div>
            </div>
            <div>
              <div className={`text-[10px] ${theme.muted}`}>pUSD</div>
              <div className="tabular-nums">{status.pusd}</div>
            </div>
            <div>
              <div className={`text-[10px] ${theme.muted}`}>USDC.e</div>
              <div className="tabular-nums">{status.usdce}</div>
            </div>
            <div className="col-span-2">
              <div className={`text-[10px] ${theme.muted}`}>
                EXCHANGE ALLOWANCE → {truncateAddr(status.spender)}
              </div>
              <div className="tabular-nums">{status.allowance} pUSD</div>
            </div>
          </div>
          <div className={`pt-2 ${theme.muted}`}>
            Test with a small size first. Collateral is pUSD (wrap USDC.e → Onramp).
          </div>
        </>
      )}

      {mode === "list" && (
        <>
          <div
            className={`flex justify-between items-center ${theme.text}/70 border-b ${theme.border} pb-1`}
          >
            <span className="font-bold">POLY MARKETS</span>
            <span className="uppercase">
              POLYGON{query ? ` · ${shortQ(query, 24)}` : ""}
            </span>
          </div>
          {(markets || []).length === 0 ? (
            <div className={`pt-2 ${theme.muted}`}>No markets matched.</div>
          ) : (
            <table className={`w-full text-left ${theme.text} mt-2`}>
              <thead>
                <tr className={`text-[10px] ${theme.text}/50 border-b ${theme.border}`}>
                  <th className="py-1 pr-2">QUESTION</th>
                  <th className="py-1 pr-2 text-right">YES</th>
                  <th className="py-1 pr-2 text-right">VOLUME</th>
                  <th className="py-1 pr-2 text-right">END</th>
                </tr>
              </thead>
              <tbody>
                {(markets || []).map((m) => (
                  <tr key={m.id || m.slug}>
                    <td className={`py-1 pr-2 ${theme.primary}`}>
                      {shortQ(m.question || m.slug || m.id)}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {fmtOdds(m.outcomePrices[0])}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">{fmtVol(m.volume)}</td>
                    <td className={`py-1 pr-2 text-right ${theme.muted} tabular-nums`}>
                      {m.endDate ? String(m.endDate).slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {moreCount != null && moreCount > 0 && (
            <div className={`pt-2 ${theme.muted}`}>
              …and {moreCount} more — narrow query
            </div>
          )}
        </>
      )}

      {mode === "show" && market && (
        <>
          <div
            className={`flex justify-between items-center ${theme.text}/70 border-b ${theme.border} pb-1 gap-2`}
          >
            <span className="font-bold truncate">
              POLY · {shortQ(market.question || market.slug, 40)}
            </span>
            <span className="flex items-center gap-2 shrink-0">
              {(book?.negRisk || market.negRisk) && (
                <span className={`${theme.warn} uppercase text-[10px]`}>NEG RISK</span>
              )}
              <span className={`${theme.muted} uppercase text-[10px]`}>CLOB</span>
            </span>
          </div>
          <div className={`mt-2 space-y-1 ${theme.text}`}>
            {market.outcomes.map((o, i) => (
              <div key={o + i} className="flex justify-between font-mono text-[11px]">
                <span>
                  {o}{" "}
                  <span className={theme.muted}>
                    {market.clobTokenIds[i]
                      ? truncateAddr(market.clobTokenIds[i], 8, 4)
                      : ""}
                  </span>
                </span>
                <span className="tabular-nums">{fmtOdds(market.outcomePrices[i])}</span>
              </div>
            ))}
          </div>
          {book && (
            <div className={`mt-2 grid grid-cols-2 gap-2 font-mono tabular-nums ${theme.text}`}>
              <div>
                <div className={`text-[10px] ${theme.muted}`}>BEST BID</div>
                <div>{book.bestBid != null ? book.bestBid.toFixed(2) : "—"}</div>
              </div>
              <div>
                <div className={`text-[10px] ${theme.muted}`}>BEST ASK</div>
                <div>{book.bestAsk != null ? book.bestAsk.toFixed(2) : "—"}</div>
              </div>
              <div>
                <div className={`text-[10px] ${theme.muted}`}>TICK</div>
                <div>{book.tickSize}</div>
              </div>
              <div>
                <div className={`text-[10px] ${theme.muted}`}>MIN ORDER SIZE</div>
                <div>{book.minOrderSize}</div>
              </div>
              {book.feeEstimate && (
                <div className="col-span-2">
                  <div className={`text-[10px] ${theme.muted}`}>TAKER FEE EST.</div>
                  <div>{book.feeEstimate}</div>
                </div>
              )}
              <div className={`col-span-2 ${theme.muted}`}>
                Suggested size = min order size ({book.minOrderSize})
              </div>
            </div>
          )}
          <div className={`pt-2 ${theme.muted}`}>
            Orders are signed off-chain and matched by the CLOB; settlement is on Polygon.
          </div>
        </>
      )}

      {mode === "positions" && (
        <>
          <div
            className={`flex justify-between items-center ${theme.text}/70 border-b ${theme.border} pb-1`}
          >
            <span className="font-bold">POLY POSITIONS</span>
            <span className="uppercase">POLYGON</span>
          </div>
          {(positions || []).length === 0 ? (
            <div className={`pt-2 ${theme.muted}`}>No positions.</div>
          ) : (
            <table className={`w-full text-left ${theme.text} mt-2`}>
              <thead>
                <tr className={`text-[10px] ${theme.text}/50 border-b ${theme.border}`}>
                  <th className="py-1 pr-2">MARKET</th>
                  <th className="py-1 pr-2">OUTCOME</th>
                  <th className="py-1 pr-2 text-right">SIZE</th>
                  <th className="py-1 pr-2 text-right">AVG</th>
                  <th className="py-1 pr-2 text-right">VALUE</th>
                </tr>
              </thead>
              <tbody>
                {(positions || []).map((r, i) => (
                  <tr key={i}>
                    <td className={`py-1 pr-2 ${theme.primary}`}>{shortQ(r.market, 32)}</td>
                    <td className="py-1 pr-2">{r.outcome}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{r.size}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{r.avgPrice}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {mode === "orders" && (
        <>
          <div
            className={`flex justify-between items-center ${theme.text}/70 border-b ${theme.border} pb-1`}
          >
            <span className="font-bold">POLY ORDERS</span>
            <span className="uppercase">POLYGON</span>
          </div>
          {(orders || []).length === 0 ? (
            <div className={`pt-2 ${theme.muted}`}>No open orders.</div>
          ) : (
            <table className={`w-full text-left ${theme.text} mt-2`}>
              <thead>
                <tr className={`text-[10px] ${theme.text}/50 border-b ${theme.border}`}>
                  <th className="py-1 pr-2">ID</th>
                  <th className="py-1 pr-2">MARKET</th>
                  <th className="py-1 pr-2">SIDE</th>
                  <th className="py-1 pr-2 text-right">PRICE</th>
                  <th className="py-1 pr-2 text-right">SIZE</th>
                  <th className="py-1 pr-2">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {(orders || []).map((r) => (
                  <tr key={r.id}>
                    <td className="py-1 pr-2 font-mono">{truncateAddr(r.id, 6, 4)}</td>
                    <td className={`py-1 pr-2 ${theme.primary}`}>{shortQ(r.market, 24)}</td>
                    <td className="py-1 pr-2">{r.side}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{r.price}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{r.size}</td>
                    <td
                      className={`py-1 pr-2 ${
                        r.status === "delayed" ? theme.warn : theme.text
                      }`}
                    >
                      {r.status}
                      {r.status === "delayed" ? " — not a fill" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
