/**
 * @file PnlPanel.tsx
 * @description INVEST-only PNL panel — mark-to-quote vs snapshot (#167)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeConfig } from "../types";
import PnlWidget, { type PnlWidgetData } from "../widgets/PnlWidget";
import { PNL_FOOTER } from "../pnl";
import { INVEST_PANEL_CHAT_GUTTER_CLASS } from "../widgets/floatingChatLayout";

export type PnlFetchResult =
  | { ok: true; data: PnlWidgetData }
  | { ok: false; error: string; empty?: boolean };

const EMPTY_GATE =
  "No snapshot found. Run SNAPSHOT first to establish a P/L baseline.";

export default function PnlPanel({
  theme,
  onClose,
  onFetch,
  onResetBaseline,
  isConnected = false,
  refreshKey = 0,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onFetch: () => Promise<PnlFetchResult>;
  /** INVEST-only: confirm then snapshot alias. */
  onResetBaseline?: () => Promise<PnlFetchResult>;
  isConnected?: boolean;
  refreshKey?: number;
  frameless?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [data, setData] = useState<PnlWidgetData | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const fetchView = useCallback(async () => {
    if (!isConnected) {
      setError("Wallet not connected.");
      setData(null);
      setEmpty(false);
      return;
    }
    setError(null);
    setEmpty(false);
    setRunning(true);
    try {
      const res = await onFetch();
      if (res.ok) {
        setData(res.data);
        setEmpty(false);
      } else {
        setData(null);
        if (res.empty) {
          setEmpty(true);
          setError(null);
        } else {
          setError(res.error);
        }
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

  const handleReset = async () => {
    if (!onResetBaseline || !isConnected) return;
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    setRunning(true);
    setError(null);
    try {
      const res = await onResetBaseline();
      if (res.ok) {
        setData(res.data);
        setEmpty(false);
      } else if (res.empty) {
        setEmpty(true);
        setData(null);
      } else {
        setError(res.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  return (
    <div
      className={`w-full flex flex-col gap-3 ${INVEST_PANEL_CHAT_GUTTER_CLASS} ${
        frameless
          ? ""
          : `max-w-[390px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="pnl-panel"
      role="dialog"
      aria-label="PnL"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          PNL
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pnl panel"
          className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${touch}`}
          data-testid="pnl-panel-close"
        >
          ×
        </button>
      </div>

      <button
        type="button"
        onClick={() => void fetchView()}
        aria-disabled={running || !isConnected}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer ${
          running || !isConnected ? "opacity-40" : ""
        } ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="pnl-refresh"
      >
        {running ? "…" : "REFRESH"}
      </button>

      {onResetBaseline && (
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={!isConnected || running}
          className={`w-full uppercase tracking-widest text-[10px] font-bold border ${theme.border} bg-transparent cursor-pointer ${theme.warn || theme.primary} ${
            !isConnected || running ? "opacity-40" : ""
          } ${touch}`}
          data-testid="pnl-reset-baseline"
        >
          {confirmReset ? "CONFIRM RESET BASELINE" : "RESET BASELINE"}
        </button>
      )}

      {empty && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pnl-empty"
          role="status"
        >
          {EMPTY_GATE}
        </div>
      )}

      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pnl-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {data && (
        <div data-testid="pnl-body" className="-my-3">
          <PnlWidget
            data={data}
            theme={theme}
            liveRefresh={false}
            pinned
          />
        </div>
      )}

      {!data && !empty && !error && (
        <div className={`text-[9px] ${theme.muted} pt-1`}>{PNL_FOOTER}</div>
      )}
    </div>
  );
}
