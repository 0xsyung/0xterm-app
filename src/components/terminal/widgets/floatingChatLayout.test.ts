/**
 * @file floatingChatLayout.test.ts
 * @description Pure panel layout math for mobile chrome clearance (#185)
 */
import { describe, expect, it } from "vitest";
import {
  FLOATING_CHAT_FALLBACK_CHROME_MD_PX,
  FLOATING_CHAT_FALLBACK_CHROME_NARROW_PX,
  FLOATING_CHAT_MD_MIN_PX,
  FLOATING_CHAT_PANEL_H,
  FLOATING_CHAT_SHEET_BELOW_PX,
  FLOATING_CHAT_TOP_GAP_PX,
  computeFloatingChatPanelLayout,
  fallbackTopChromeHeight
} from "./floatingChatLayout";

describe("computeFloatingChatPanelLayout (#185)", () => {
  it("leaves ≥768 desktop/tablet layout unchanged", () => {
    const layout = computeFloatingChatPanelLayout({
      viewportWidth: 768,
      viewportHeight: 1024,
      bubbleBottom: 160,
      topChromeHeight: 48
    });
    expect(layout.mode).toBe("anchored");
    expect(layout.bottom).toBe(160);
    expect(layout.right).toBe(12);
    expect(layout.height).toBe(`min(60vh, ${FLOATING_CHAT_PANEL_H}px)`);
    expect(layout.maxHeight).toBe(FLOATING_CHAT_PANEL_H);
    expect(layout.minHeight).toBe(240);
    expect(layout.top).toBeUndefined();
    expect(layout.left).toBeUndefined();
  });

  it("caps narrow height to space under top chrome with ≥8px gap", () => {
    // 390×844 CONSOLE-ish: tall chrome + tall prompt → preferred 480 would overlap.
    const viewportHeight = 844;
    const topChromeHeight = 180;
    const bubbleBottom = 200;
    const layout = computeFloatingChatPanelLayout({
      viewportWidth: 390,
      viewportHeight,
      bubbleBottom,
      topChromeHeight
    });
    const available =
      viewportHeight - topChromeHeight - FLOATING_CHAT_TOP_GAP_PX - bubbleBottom;
    expect(layout.availableHeight).toBe(available);
    expect(available).toBeGreaterThanOrEqual(FLOATING_CHAT_SHEET_BELOW_PX);
    expect(layout.mode).toBe("anchored");
    expect(layout.height).toBe(available);
    expect(layout.maxHeight).toBe(available);
    expect(layout.minHeight).toBeLessThanOrEqual(available as number);
    // Panel top = vh - bottom - height ≥ chrome + gap
    const top =
      viewportHeight - (layout.bottom as number) - (layout.height as number);
    expect(top).toBeGreaterThanOrEqual(topChromeHeight + FLOATING_CHAT_TOP_GAP_PX);
  });

  it("uses preferred min(60vh, 480) when there is room on narrow", () => {
    const layout = computeFloatingChatPanelLayout({
      viewportWidth: 390,
      viewportHeight: 900,
      bubbleBottom: 120,
      topChromeHeight: 120
    });
    // available = 900 - 120 - 8 - 120 = 652; preferred = min(540, 480) = 480
    expect(layout.mode).toBe("anchored");
    expect(layout.height).toBe(480);
    expect(layout.maxHeight).toBe(480);
  });

  it("falls back to a full-width sheet when available < ~200px", () => {
    const viewportHeight = 500;
    const topChromeHeight = 180;
    const bubbleBottom = 160;
    const available =
      viewportHeight - topChromeHeight - FLOATING_CHAT_TOP_GAP_PX - bubbleBottom;
    expect(available).toBeLessThan(FLOATING_CHAT_SHEET_BELOW_PX);

    const layout = computeFloatingChatPanelLayout({
      viewportWidth: 260,
      viewportHeight,
      bubbleBottom,
      topChromeHeight
    });
    expect(layout.mode).toBe("sheet");
    expect(layout.top).toBe(topChromeHeight + FLOATING_CHAT_TOP_GAP_PX);
    expect(layout.left).toBe(0);
    expect(layout.right).toBe(0);
    expect(layout.bottom).toBe(bubbleBottom);
    expect(layout.width).toBe("100%");
    expect(layout.height).toBe(available);
    expect(layout.maxWidth).toBe("100%");
  });

  it("never forces minHeight above the capped height on narrow", () => {
    const layout = computeFloatingChatPanelLayout({
      viewportWidth: 375,
      viewportHeight: 667,
      bubbleBottom: 180,
      topChromeHeight: 170
    });
    // available = 667 - 170 - 8 - 180 = 309
    expect(layout.mode).toBe("anchored");
    expect(layout.height).toBe(309);
    expect(layout.minHeight).toBeLessThanOrEqual(309);
  });
});

describe("fallbackTopChromeHeight (#185)", () => {
  it("matches HEADER_H soft floors", () => {
    expect(fallbackTopChromeHeight(FLOATING_CHAT_MD_MIN_PX)).toBe(
      FLOATING_CHAT_FALLBACK_CHROME_MD_PX
    );
    expect(fallbackTopChromeHeight(FLOATING_CHAT_MD_MIN_PX - 1)).toBe(
      FLOATING_CHAT_FALLBACK_CHROME_NARROW_PX
    );
  });
});
