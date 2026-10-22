/**
 * @file ProBuyPanel.tsx
 * @description ProPass buy chrome — periods stepper + ETH total (Soft ACK #139 Design H)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "../types";
import { PRO_MAX_PERIODS, PRO_REFUSE } from "./constants";
import { clampPeriods, formatEthAmount, purchaseCost } from "./buy";

const TOUCH =
  "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] [@media(hover:none)]:min-h-[44px]";

export default function ProBuyPanel({
  theme,
  onClose,
  pricePerPeriod,
  priceLoading = false,
  priceError = null,
  busy = false,
  onConfirm
}: {
  theme: ThemeConfig;
  onClose: () => void;
  pricePerPeriod: bigint | null;
  priceLoading?: boolean;
  priceError?: string | null;
  busy?: boolean;
  onConfirm: (periods: number) => void | Promise<void>;
}) {
  const [periods, setPeriods] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const total =
    pricePerPeriod != null ? purchaseCost(pricePerPeriod, periods) : null;

  const bump = (delta: number) => {
    setPeriods((p) => clampPeriods(p + delta));
    setLocalError(null);
    setDone(null);
  };

  const confirm = async () => {
    setLocalError(null);
    setDone(null);
    const p = clampPeriods(periods);
    setPeriods(p);
    try {
      await onConfirm(p);
      setDone(`[✓] Purchase submitted — ${p} period(s) · new mint`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setLocalError(msg.slice(0, 160) || "Purchase failed");
    }
  };

  const fieldBtn = `inline-flex items-center justify-center w-8 h-8 border ${theme.border} ${theme.primary} bg-transparent cursor-pointer ${TOUCH} disabled:opacity-40`;
  const primaryBtn = `cursor-pointer uppercase tracking-widest text-[10px] px-2.5 py-1.5 border ${theme.border} ${theme.primary} ${theme.cardBg || "bg-transparent"} ${TOUCH} disabled:opacity-40`;

  return (
    <div
      className={`w-full max-w-[360px] flex flex-col gap-3 p-3 border ${theme.border} ${theme.cardBg || theme.bg} ${theme.rounded || "rounded-none"}`}
      data-testid="pro-buy-panel"
      role="dialog"
      aria-label="Buy Pro"
      aria-modal="true"
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          BUY PRO
        </span>
        <span className={`text-[10px] ${theme.muted}`}>new mint · never extend</span>
      </div>

      <p className={`text-[10px] leading-snug ${theme.muted}`} data-testid="pro-buy-note">
        {PRO_REFUSE.alwaysNew}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`uppercase text-[10px] tracking-widest ${theme.muted}`}>
          Periods
        </span>
        <button
          type="button"
          data-testid="pro-buy-periods-dec"
          aria-label="Decrease periods"
          className={fieldBtn}
          disabled={busy || periods <= 1}
          onClick={() => bump(-1)}
        >
          −
        </button>
        <input
          data-testid="pro-buy-periods"
          type="number"
          min={1}
          max={PRO_MAX_PERIODS}
          value={periods}
          disabled={busy}
          onChange={(e) => {
            const n = Number(e.target.value);
            setPeriods(clampPeriods(Number.isFinite(n) ? n : 1));
            setLocalError(null);
            setDone(null);
          }}
          className={`w-14 bg-transparent border ${theme.border} px-2 py-1.5 text-[11px] font-mono tabular-nums text-center ${theme.text} ${TOUCH}`}
        />
        <button
          type="button"
          data-testid="pro-buy-periods-inc"
          aria-label="Increase periods"
          className={fieldBtn}
          disabled={busy || periods >= PRO_MAX_PERIODS}
          onClick={() => bump(1)}
        >
          +
        </button>
        <span className={`text-[10px] tabular-nums ${theme.muted}`}>
          1–{PRO_MAX_PERIODS}
        </span>
      </div>

      <div
        className={`text-[11px] font-mono tabular-nums ${theme.primary}`}
        data-testid="pro-buy-total"
      >
        {priceLoading
          ? "Loading price…"
          : priceError
            ? null
            : total != null && pricePerPeriod != null
              ? `Total ${formatEthAmount(total)} ETH · ${formatEthAmount(pricePerPeriod)} ETH / period`
              : "—"}
      </div>

      {(priceError || localError) && (
        <div
          className={`text-[11px] ${theme.warn}`}
          data-testid="pro-buy-error"
        >
          {priceError || localError}
        </div>
      )}
      {done && (
        <div
          className={`text-[11px] ${theme.primary}`}
          data-testid="pro-buy-success"
        >
          {done}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          data-testid="pro-buy-confirm"
          className={primaryBtn}
          disabled={busy || priceLoading || pricePerPeriod == null || !!priceError}
          onClick={() => void confirm()}
        >
          {busy ? "Confirming…" : "Confirm / wallet"}
        </button>
        <button
          type="button"
          data-testid="pro-buy-dismiss"
          className={`cursor-pointer uppercase tracking-widest text-[10px] px-2.5 py-1.5 border ${theme.border} ${theme.muted} bg-transparent ${TOUCH}`}
          onClick={onClose}
        >
          Esc
        </button>
      </div>
    </div>
  );
}
