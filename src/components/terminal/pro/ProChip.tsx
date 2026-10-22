/**
 * @file ProChip.tsx
 * @description Header PRO / GET PRO chip (Soft ACK #139 Design G)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";

const TOUCH =
  "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] [@media(hover:none)]:min-h-[44px]";

/**
 * Soft ACK Design G — when isPro show PRO (optional days-left); when not Pro
 * prefer hide. Soft-nice muted GET PRO only when `showBuyCta` (buy one click).
 */
export default function ProChip({
  theme,
  isPro,
  daysLeft = null,
  showBuyCta = false,
  onOpenStatus,
  onOpenBuy
}: {
  theme: ThemeConfig;
  isPro: boolean;
  /** Soft-nice days left on furthest active pass. */
  daysLeft?: number | null;
  /** Soft-nice non-Pro CTA — prefer false (hide) unless buy is one click away. */
  showBuyCta?: boolean;
  onOpenStatus?: () => void;
  onOpenBuy?: () => void;
}) {
  if (isPro) {
    return (
      <button
        type="button"
        data-testid="header-pro-chip"
        aria-label={
          daysLeft != null ? `Pro active · ${daysLeft} days left` : "Pro active"
        }
        title={
          daysLeft != null ? `Pro · ${daysLeft}d left · status` : "Pro · status"
        }
        onClick={() => onOpenStatus?.()}
        className={`inline-flex items-center justify-center gap-1 px-2.5 uppercase tracking-widest text-[10px] cursor-pointer border font-bold ${TOUCH} ${theme.border} ${theme.primary} ${theme.cardBg || "bg-transparent"}`}
      >
        <span>PRO</span>
        {daysLeft != null ? (
          <span className={`font-normal tabular-nums ${theme.muted}`}>
            {daysLeft}d
          </span>
        ) : null}
      </button>
    );
  }

  if (showBuyCta) {
    return (
      <button
        type="button"
        data-testid="header-pro-chip-buy"
        aria-label="Get Pro membership"
        title="Get Pro · buy"
        onClick={() => onOpenBuy?.()}
        className={`inline-flex items-center justify-center gap-1 px-2.5 uppercase tracking-widest text-[10px] cursor-pointer border ${TOUCH} ${theme.border} ${theme.muted} bg-transparent`}
      >
        GET PRO
      </button>
    );
  }

  return null;
}
