/**
 * @file theme.ts
 * @description V2 single Finance theme (#295) — no theme zoo day one
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { ThemeConfig, ThemeMode } from "@/components/terminal/types";

/** Sole day-one theme key. */
export const V2_THEME_KEY: ThemeMode = "finance";

/** Professional finance chrome tokens (Design lock). */
export const FINANCE_THEME: ThemeConfig = {
  name: "Finance",
  bg: "bg-[#0b0d10]",
  cardBg: "bg-[#12151a]/95",
  text: "text-[#d7dde5]",
  primary: "text-[#6ee7b7]",
  border: "border-white/10",
  glow: "shadow-[0_0_0_1px_rgba(110,231,183,0.12)]",
  font: "font-plex tracking-tight",
  rounded: "rounded-md",
  promptSymbol: "›",
  hasScanlines: false,
  hasGrid: false,
  warn: "text-[#f0a060] border-[#f0a060]/50 bg-[#f0a060]/10",
  muted: "text-white/40",
  phosphor: "#6ee7b7",
  scanlineAlpha: "0",
  gridColor: "#1f2933"
};

export function getV2Theme(): ThemeConfig {
  return FINANCE_THEME;
}
