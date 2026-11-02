/**
 * @file SegmentButton.tsx
 * @description Shared segmented sub-tab control — SOCIAL INBOX/BOARD + workspace mode tabs (#140/#145)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { BTN_TOUCH } from "../ui/buttonClasses";
import { formatBadgeCount } from "../socialUnread";

export function SegmentButton({
  label,
  active,
  badge,
  theme,
  quiet,
  onClick
}: {
  label: string;
  active: boolean;
  badge?: number;
  theme: ThemeConfig;
  quiet?: boolean;
  onClick: () => void;
}) {
  const badgeLabel = formatBadgeCount(badge ?? 0);
  const radius = "rounded-none";
  const fillFg = "#000000";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`btn-base btn-hug relative inline-flex items-center justify-center gap-2 shrink-0 w-auto max-w-full cursor-pointer ${BTN_TOUCH} ${radius} ${
        quiet ? "btn-sm h-8 px-3 max-md:px-2 text-[10px]" : "btn-md h-9 px-4 text-[11px]"
      } ${
        active
          ? "btn-primary border border-transparent font-bold"
          : `btn-secondary border ${theme.border} ${theme.muted} bg-transparent`
      }`}
      style={
        active
          ? { background: theme.phosphor, color: fillFg }
          : undefined
      }
    >
      {label}
      {badgeLabel && (
        <span
          className={`inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[9px] leading-none font-bold ${radius}`}
          style={{
            background: active ? fillFg : theme.phosphor,
            color: active ? theme.phosphor : fillFg
          }}
          aria-label={`${badgeLabel} unread`}
        >
          {badgeLabel}
        </span>
      )}
    </button>
  );
}
