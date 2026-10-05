/**
 * @file SegmentButton.tsx
 * @description Shared segmented sub-tab control — SOCIAL INBOX/BOARD + workspace mode tabs (#140/#145)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
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
      className={`relative inline-flex items-center justify-center gap-1.5 px-3 uppercase tracking-widest cursor-pointer pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] [@media(hover:none)]:min-h-[44px] ${radius} ${
        quiet ? "text-[10px]" : "text-[11px]"
      } ${
        active
          ? "border border-transparent font-bold"
          : `border ${theme.border} ${theme.muted} bg-transparent`
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
