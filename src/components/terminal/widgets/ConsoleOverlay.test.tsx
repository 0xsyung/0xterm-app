// @vitest-environment jsdom
/**
 * @file ConsoleOverlay.test.tsx
 * @description Console overlay × / Escape (#253 E)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import ConsoleOverlay from "./ConsoleOverlay";

const theme = THEMES.matrix;

describe("ConsoleOverlay (#253 E)", () => {
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
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
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
});
