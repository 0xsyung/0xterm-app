/**
 * @file ConsoleOverlay.tsx
 * @description Settings/CLI console command overlay — bg alpha 0.8 + × (#253 E)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, type ReactNode, type RefObject } from "react";
import type { ThemeConfig } from "../types";

/**
 * Soft ACK #253 E — Syung “20% transparent” → panel background alpha 0.8
 * (20% see-through). Optional scrim `bg-black/20`. Theme tokens only.
 */
export default function ConsoleOverlay({
  theme,
  onClose,
  log,
  footer,
  logRef
}: {
  theme: ThemeConfig;
  onClose: () => void;
  /** Scrollback / log body. */
  log: ReactNode;
  /** Sticky command prompt (focused on open). */
  footer: ReactNode;
  logRef?: RefObject<HTMLDivElement | null>;
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

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] [@media(hover:none)]:min-h-[44px] [@media(hover:none)]:min-w-[44px]";

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      data-testid="console-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Console"
    >
      <div
        className="absolute inset-0 bg-black/20"
        data-testid="console-overlay-scrim"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={`relative z-[1] m-2 sm:m-4 flex-1 min-h-0 flex flex-col border ${theme.border} ${theme.rounded || "rounded-none"} overflow-hidden`}
        data-testid="console-overlay-panel"
      >
        {/* Opaque-token layer at 80% — 20% see-through to workspace underneath */}
        <div
          className={`absolute inset-0 ${theme.cardBg || theme.bg} opacity-80 pointer-events-none`}
          aria-hidden
        />
        <div className="relative z-[1] flex flex-col flex-1 min-h-0">
          <div
            className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${theme.border} shrink-0`}
          >
            <span
              className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
            >
              CONSOLE
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close console"
              data-testid="console-overlay-close"
              className={`inline-flex items-center justify-center w-8 h-8 ${touch} border ${theme.border} ${theme.muted} cursor-pointer ${theme.rounded || "rounded-none"} bg-transparent`}
            >
              ×
            </button>
          </div>
          <div
            ref={logRef}
            className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 whitespace-pre-wrap"
            data-testid="console-overlay-log"
          >
            {log}
          </div>
          <div className="shrink-0 border-t border-transparent" data-testid="console-overlay-prompt">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
