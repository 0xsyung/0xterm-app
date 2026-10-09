/**
 * @file ChannelSwitchToast.tsx
 * @description Ephemeral CONSOLE-log-style ack for out-of-CONSOLE channel switches (#180).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { channelSwitchToastBottomPx } from "../chatChannels";

export type ChannelSwitchToastProps = {
  theme: ThemeConfig;
  /** Prefer theme.rounded only when soft (macintosh); else sharp. */
  themeKey?: string;
  text: string;
  /** Same clearance the floating chat bubble uses. */
  promptClearancePx: number;
};

/**
 * Absolute shell toast — z-[24] under top nav (z-30) and floating chat panel (z-25)
 * so it never covers the chat header ×. Looks like a CONSOLE log line, not a snackbar.
 */
export default function ChannelSwitchToast({
  theme,
  themeKey,
  text,
  promptClearancePx
}: ChannelSwitchToastProps) {
  const radius =
    themeKey === "macintosh" ||
    (theme.rounded && theme.rounded !== "rounded-none")
      ? theme.rounded || "rounded-none"
      : "rounded-none";
  const bottom = channelSwitchToastBottomPx(promptClearancePx);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="channel-switch-toast"
      className={`absolute z-[24] max-w-[min(22rem,calc(100vw-1.5rem))] pointer-events-none border ${theme.border} ${theme.cardBg} ${theme.text} font-mono text-[11px] leading-snug px-2.5 py-1.5 shadow-lg ${radius}`}
      style={{
        bottom,
        right: 12,
        borderLeftWidth: 3,
        borderLeftColor: theme.phosphor
      }}
    >
      {text}
    </div>
  );
}
