/**
 * @file floatingChatLayout.ts
 * @description Pure layout math for the floating chat panel (#185).
 * Caps mobile panel height so the header stays below top chrome; ≥768 unchanged.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved.
 */

export const FLOATING_CHAT_PANEL_W = 360;
export const FLOATING_CHAT_PANEL_H = 480;
export const FLOATING_CHAT_PANEL_MIN_W = 280;
export const FLOATING_CHAT_PANEL_MIN_H = 360;
/** Soft minHeight floor used on desktop; never exceeds available on mobile. */
export const FLOATING_CHAT_PANEL_SOFT_MIN_H = 240;
export const FLOATING_CHAT_RIGHT_PX = 12;
/** Gap between top chrome bottom and panel top (#185 Stephy). */
export const FLOATING_CHAT_TOP_GAP_PX = 8;
/** Below this available height, use a full-width sheet (#185). */
export const FLOATING_CHAT_SHEET_BELOW_PX = 200;
/** md breakpoint — desktop/tablet layout unchanged at and above. */
export const FLOATING_CHAT_MD_MIN_PX = 768;
/** Fallback chrome heights when the live header isn't measurable (matches HEADER_H). */
export const FLOATING_CHAT_FALLBACK_CHROME_MD_PX = 48;
export const FLOATING_CHAT_FALLBACK_CHROME_NARROW_PX = 120;

export type FloatingChatLayoutMode = "anchored" | "sheet";

export type FloatingChatPanelLayout = {
  mode: FloatingChatLayoutMode;
  /** Available pixels between top chrome (+gap) and bubbleBottom. */
  availableHeight: number;
  bottom: number;
  right: number;
  top?: number;
  left?: number;
  width: string;
  height: string | number;
  minWidth: string;
  minHeight: number;
  maxWidth: number | string;
  maxHeight: number | string;
};

export type ComputeFloatingChatPanelLayoutArgs = {
  viewportWidth: number;
  viewportHeight: number;
  bubbleBottom: number;
  topChromeHeight: number;
};

/**
 * Desktop/tablet (≥768): same card as before — bottom-anchored, min(60vh, 480).
 * Narrow: cap height to space above bubbleBottom with ≥8px under top chrome.
 * If that space is under ~200px, switch to a full-width sheet below the chrome.
 */
export function computeFloatingChatPanelLayout({
  viewportWidth,
  viewportHeight,
  bubbleBottom,
  topChromeHeight
}: ComputeFloatingChatPanelLayoutArgs): FloatingChatPanelLayout {
  const safeBottom = Math.max(0, bubbleBottom);
  const safeChrome = Math.max(0, topChromeHeight);
  const availableHeight = Math.max(
    0,
    viewportHeight - safeChrome - FLOATING_CHAT_TOP_GAP_PX - safeBottom
  );

  if (viewportWidth >= FLOATING_CHAT_MD_MIN_PX) {
    return {
      mode: "anchored",
      availableHeight,
      bottom: safeBottom,
      right: FLOATING_CHAT_RIGHT_PX,
      width: `min(calc(100vw - 16px), ${FLOATING_CHAT_PANEL_W}px)`,
      height: `min(60vh, ${FLOATING_CHAT_PANEL_H}px)`,
      minWidth: `min(${FLOATING_CHAT_PANEL_MIN_W}px, calc(100vw - 16px))`,
      minHeight: Math.min(
        FLOATING_CHAT_PANEL_MIN_H,
        FLOATING_CHAT_PANEL_SOFT_MIN_H
      ),
      maxWidth: FLOATING_CHAT_PANEL_W,
      maxHeight: FLOATING_CHAT_PANEL_H
    };
  }

  if (availableHeight < FLOATING_CHAT_SHEET_BELOW_PX) {
    return {
      mode: "sheet",
      availableHeight,
      top: safeChrome + FLOATING_CHAT_TOP_GAP_PX,
      left: 0,
      right: 0,
      bottom: safeBottom,
      width: "100%",
      // top + bottom define height; keep an explicit px for tests / minHeight.
      height: availableHeight,
      minWidth: "0px",
      minHeight: 0,
      maxWidth: "100%",
      maxHeight: availableHeight
    };
  }

  const preferred = Math.min(
    viewportHeight * 0.6,
    FLOATING_CHAT_PANEL_H
  );
  const height = Math.max(0, Math.min(preferred, availableHeight));
  const softMin = Math.min(
    FLOATING_CHAT_PANEL_MIN_H,
    FLOATING_CHAT_PANEL_SOFT_MIN_H
  );

  return {
    mode: "anchored",
    availableHeight,
    bottom: safeBottom,
    right: FLOATING_CHAT_RIGHT_PX,
    width: `min(calc(100vw - 16px), ${FLOATING_CHAT_PANEL_W}px)`,
    height,
    minWidth: `min(${FLOATING_CHAT_PANEL_MIN_W}px, calc(100vw - 16px))`,
    // Never force a minHeight taller than the capped height (would re-overlap).
    minHeight: Math.min(softMin, height),
    maxWidth: FLOATING_CHAT_PANEL_W,
    maxHeight: height
  };
}

/** Pick a fallback chrome height when `[data-terminal-header]` isn't in the DOM. */
export function fallbackTopChromeHeight(viewportWidth: number): number {
  return viewportWidth >= FLOATING_CHAT_MD_MIN_PX
    ? FLOATING_CHAT_FALLBACK_CHROME_MD_PX
    : FLOATING_CHAT_FALLBACK_CHROME_NARROW_PX;
}
