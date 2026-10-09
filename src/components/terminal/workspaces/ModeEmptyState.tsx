/**
 * @file ModeEmptyState.tsx
 * @description Soft empty-state card under mode tile strip when no tool panel (#140 Slice A)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import type { TerminalMode } from "../mode";

export const MODE_EMPTY_COPY: Record<
  Exclude<TerminalMode, "console">,
  { title: string; body: string; testId: string }
> = {
  invest: {
    title: "INVEST",
    body: "Pick a tool above — Price, Swap, News, Portfolio, or Perps.",
    testId: "mode-empty-invest"
  },
  dev: {
    title: "DEV",
    body: "No tools in this mode yet.",
    testId: "mode-empty-dev"
  },
  forensic: {
    title: "FORENSIC",
    body: "Pick a tool above — Sim, Trace, or screen an address.",
    testId: "mode-empty-forensic"
  }
};

export function ModeEmptyState({
  theme,
  mode
}: {
  theme: ThemeConfig;
  mode: Exclude<TerminalMode, "console">;
}) {
  const copy = MODE_EMPTY_COPY[mode];
  return (
    <div
      data-testid={copy.testId}
      className={`mt-1 flex-1 min-h-[120px] border ${theme.border} ${theme.cardBg} p-4 flex flex-col justify-center gap-1`}
    >
      <div
        className={`uppercase tracking-widest text-[10px] md:text-[11px] font-bold ${theme.primary}`}
      >
        {copy.title}
      </div>
      <div className={`text-[10px] md:text-[11px] ${theme.muted}`}>{copy.body}</div>
    </div>
  );
}
