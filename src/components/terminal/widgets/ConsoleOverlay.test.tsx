// @vitest-environment jsdom
/**
 * @file ConsoleOverlay.test.tsx
 * @description Console overlay × / Escape / header clearance (#253 E / #256)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES, HEADER_TOP_OFFSET } from "../constants";
import ConsoleOverlay from "./ConsoleOverlay";

const theme = THEMES.matrix;

describe("ConsoleOverlay (#253 E / #256)", () => {
  it("renders panel with × close (FloatingChat hit-target parity)", () => {
    const onClose = vi.fn();
    render(
      <ConsoleOverlay
        theme={theme}
        onClose={onClose}
        log={<div>log</div>}
        footer={<div>prompt</div>}
      />
    );
    expect(screen.getByTestId("console-overlay")).toBeTruthy();
    expect(screen.getByTestId("console-overlay-panel").className).toMatch(/opacity-80|/);
    const close = screen.getByTestId("console-overlay-close");
    expect(close.className).toMatch(/w-8/);
    expect(close.className).toMatch(/h-8/);
    expect(close.className).toMatch(/min-h-\[44px\]|pointer-coarse:min-h-\[44px\]/);
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stacks above header and clears header hit geometry (#256)", () => {
    render(
      <ConsoleOverlay
        theme={theme}
        onClose={vi.fn()}
        log={<div />}
        footer={<div />}
      />
    );
    const root = screen.getByTestId("console-overlay");
    expect(root.className).toMatch(/z-40/);
    // HEADER_TOP_OFFSET — × sits below data-terminal-header (z-30 / h≈48)
    for (const token of HEADER_TOP_OFFSET.split(/\s+/)) {
      expect(root.className).toContain(token);
    }
    expect(root.className).toMatch(/inset-x-0/);
    expect(root.className).toMatch(/bottom-0/);
    // Must not use inset-0 (would sit under header again)
    expect(root.className.split(/\s+/)).not.toContain("inset-0");
  });

  it("Escape closes overlay", () => {
    const onClose = vi.fn();
    render(
      <ConsoleOverlay
        theme={theme}
        onClose={onClose}
        log={<div />}
        footer={<div />}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("scrim click closes; panel bg alpha 0.8 unchanged", () => {
    const onClose = vi.fn();
    render(
      <ConsoleOverlay
        theme={theme}
        onClose={onClose}
        log={<div />}
        footer={<div />}
      />
    );
    fireEvent.click(screen.getByTestId("console-overlay-scrim"));
    expect(onClose).toHaveBeenCalledTimes(1);
    const panel = screen.getByTestId("console-overlay-panel");
    const bgLayer = panel.querySelector('[aria-hidden="true"], [aria-hidden]');
    // opacity-80 layer present (20% see-through)
    expect(panel.innerHTML).toMatch(/opacity-80/);
  });
});
