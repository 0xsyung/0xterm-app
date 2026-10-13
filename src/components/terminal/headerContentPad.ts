/**
 * @file headerContentPad.ts
 * @description Live `[data-terminal-header]` height → content top pad (#202).
 * Prefer measure over magic HEADER_PAD alone (same idea as floating-chat chrome).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { useEffect, useState } from "react";

/** Gap between absolute header bottom and content top (#202 Soft ACK ≥8px). */
export const HEADER_CONTENT_GAP_PX = 8;

/**
 * Narrow soft floor when header is unmeasured or shorter than floor − gap.
 * Raised 120 → 144 so 44px touch chips under a ~134px header are not sliced.
 */
export const HEADER_PAD_NARROW_FLOOR_PX = 144;

/** Content pad (px, before safe-area) for max-md. */
export function computeNarrowContentPadPx(
  headerHeightPx: number | null | undefined
): number {
  if (
    headerHeightPx == null ||
    !Number.isFinite(headerHeightPx) ||
    headerHeightPx <= 0
  ) {
    return HEADER_PAD_NARROW_FLOOR_PX;
  }
  return Math.max(
    HEADER_PAD_NARROW_FLOOR_PX,
    Math.ceil(headerHeightPx) + HEADER_CONTENT_GAP_PX
  );
}

/**
 * Measure absolute `[data-terminal-header]` and return narrow content pad px.
 * Desktop (`md+`) still uses CSS `md:pt-[calc(48px_+_env(...))]` — this value
 * only feeds `--terminal-header-pad` for `max-md`.
 */
export function useTerminalHeaderContentPad(): number {
  const [padPx, setPadPx] = useState(HEADER_PAD_NARROW_FLOOR_PX);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.querySelector("[data-terminal-header]");
    if (!el || typeof ResizeObserver === "undefined") {
      /* eslint-disable react-hooks/set-state-in-effect -- #202 fallback when header unmeasurable */
      setPadPx(HEADER_PAD_NARROW_FLOOR_PX);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    const apply = () => {
      setPadPx(
        computeNarrowContentPadPx(
          Math.ceil(el.getBoundingClientRect().height)
        )
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return padPx;
}
