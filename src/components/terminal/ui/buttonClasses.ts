/**
 * @file buttonClasses.ts
 * @description Soft ACK #294 — whole-app button class tokens (Soft Design Soft-locks A–G).
 * Default: hug-content + start-aligned labels. Full-row (`block`) only for Soft Design F
 * exceptions (CONNECT/SIGN/Confirm narrow stacks, settings full-bleed rows, mobile sticky
 * sole CTA) and Soft Design A form-primary in narrow panels.
 * Soft-on-behalf OFF — Eng does not merge.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

import type { ThemeConfig } from "../types";

export type BtnVariant = "primary" | "secondary" | "ghost" | "warn";
export type BtnSize = "sm" | "md" | "lg";

/** Soft Design C — ≥44px touch on mobile / coarse pointer. */
export const BTN_TOUCH =
  "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

/** Soft Design token: btn-base */
export const BTN_BASE =
  "btn-base inline-flex items-center gap-2 border font-bold text-[10px] transition cursor-pointer disabled:opacity-[0.4] disabled:cursor-not-allowed";

/** Soft Design token: btn-hug (default) */
export const BTN_HUG = "btn-hug w-auto max-w-full justify-start text-left";

/** Soft Design token: btn-block — Soft Design F / form-primary exceptions only */
export const BTN_BLOCK = "btn-block w-full justify-center text-center";

/** Soft Design C size tokens */
export const BTN_SM = "btn-sm h-8 px-3";
export const BTN_MD = "btn-md h-9 px-4";
export const BTN_LG = "btn-lg h-11 px-4";

export function btnSizeClass(size: BtnSize = "md"): string {
  switch (size) {
    case "sm":
      return BTN_SM;
    case "lg":
      return BTN_LG;
    default:
      return BTN_MD;
  }
}

export function btnVariantClass(
  theme: ThemeConfig,
  variant: BtnVariant = "primary"
): string {
  switch (variant) {
    case "secondary":
      return `btn-secondary ${theme.border} ${theme.muted} bg-transparent`;
    case "ghost":
      return `btn-ghost border-transparent ${theme.muted} bg-transparent`;
    case "warn":
      return `btn-warn ${theme.border} ${theme.warn || theme.primary} bg-transparent`;
    case "primary":
    default:
      // Solid phosphor fill via btnPrimaryFillStyle; keep border transparent.
      return "btn-primary border-transparent";
  }
}

export type BtnClassOpts = {
  theme: ThemeConfig;
  variant?: BtnVariant;
  size?: BtnSize;
  /** Soft Design F / Soft Design A form-primary — full-row + center. */
  block?: boolean;
  className?: string;
};

/** Compose Soft ACK #294 button classes. */
export function btnClass(opts: BtnClassOpts): string {
  const {
    theme,
    variant = "primary",
    size = "md",
    block = false,
    className = ""
  } = opts;
  return [
    BTN_BASE,
    block ? BTN_BLOCK : BTN_HUG,
    btnSizeClass(size),
    btnVariantClass(theme, variant),
    BTN_TOUCH,
    className
  ]
    .filter(Boolean)
    .join(" ");
}

/** Phosphor solid fill for primary CTAs (theme Soft-lock D). */
export function btnPrimaryFillStyle(theme: ThemeConfig): {
  background: string;
  color: string;
} {
  return { background: theme.phosphor, color: "#000000" };
}

/**
 * Chip / pill Soft-lock — hug + start-aligned (Soft Design A/B Soft FAIL if w-full + center).
 * Active uses phosphor fill via btnPrimaryFillStyle / btnChipActiveStyle.
 */
export function btnChipClass(
  theme: ThemeConfig,
  active: boolean,
  size: BtnSize = "sm"
): string {
  return [
    BTN_BASE,
    BTN_HUG,
    btnSizeClass(size),
    BTN_TOUCH,
    active
      ? "btn-primary border-transparent"
      : `btn-secondary ${theme.border} ${theme.muted} bg-transparent`
  ].join(" ");
}

export function btnChipActiveStyle(theme: ThemeConfig): {
  background: string;
  color: string;
} {
  return btnPrimaryFillStyle(theme);
}
