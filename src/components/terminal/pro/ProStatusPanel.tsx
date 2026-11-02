/**
 * @file ProStatusPanel.tsx
 * @description ProPass status chrome — active list + expired count (Soft ACK #139 Design H)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect } from "react";
import type { ThemeConfig } from "../types";
import { BTN_TOUCH, btnClass } from "../ui/buttonClasses";
import type { ProStatus } from "./status";
import { formatRemaining } from "./status";

const TOUCH = BTN_TOUCH;

export default function ProStatusPanel({
  theme,
  onClose,
  status,
  loading = false,
  error = null,
  onRenew
}: {
  theme: ThemeConfig;
  onClose: () => void;
  status: Extract<ProStatus, { ok: true }> | null;
  loading?: boolean;
  error?: string | null;
  onRenew: () => void;
}) {
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

  const primaryBtn = btnClass({ theme, variant: "primary", size: "md", className: `${theme.primary} ${theme.cardBg || "bg-transparent"}` });

  return (
    <div
      className={`w-full max-w-[360px] flex flex-col gap-3 p-3 border ${theme.border} ${theme.cardBg || theme.bg} ${theme.rounded || "rounded-none"}`}
      data-testid="pro-status-panel"
      role="dialog"
      aria-label="Pro status"
      aria-modal="true"
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          PRO STATUS
        </span>
        {status ? (
          <span
            className={`text-[10px] uppercase tracking-widest ${
              status.isPro ? theme.primary : theme.muted
            }`}
            data-testid="pro-status-flag"
          >
            {status.isPro ? "ACTIVE" : "inactive"}
          </span>
        ) : null}
      </div>

      {loading && (
        <div className={`text-[11px] ${theme.muted}`}>Loading…</div>
      )}
      {error && (
        <div className={`text-[11px] ${theme.warn}`} data-testid="pro-status-error">
          {error}
        </div>
      )}

      {status && !loading ? (
        <>
          <div
            className={`text-[10px] tabular-nums ${theme.muted}`}
            data-testid="pro-status-summary"
          >
            active {status.active.length} · expired {status.expiredCount}
          </div>
          <ul
            className="flex flex-col gap-1.5 m-0 p-0 list-none"
            data-testid="pro-status-active-list"
          >
            {status.active.length === 0 ? (
              <li className={`text-[11px] ${theme.muted}`}>
                (no active passes)
              </li>
            ) : (
              status.active.map((row) => (
                <li
                  key={String(row.tokenId)}
                  className={`text-[11px] font-mono tabular-nums ${theme.primary}`}
                  data-testid={`pro-status-token-${row.tokenId}`}
                >
                  #{row.tokenId.toString()} · expiresAt={row.expiresAt.toString()}{" "}
                  · {formatRemaining(row.expiresAt, status.now)}
                </li>
              ))
            )}
          </ul>
          <div
            className={`text-[10px] tabular-nums ${theme.muted}`}
            data-testid="pro-status-expired-count"
          >
            Expired (still owned): {status.expiredCount}
          </div>
        </>
      ) : null}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          data-testid="pro-status-renew"
          className={primaryBtn}
          onClick={onRenew}
        >
          Renew · buy new
        </button>
        <button
          type="button"
          data-testid="pro-status-dismiss"
          className={btnClass({ theme, variant: "secondary", size: "md" })}
          onClick={onClose}
        >
          Esc
        </button>
      </div>
    </div>
  );
}
