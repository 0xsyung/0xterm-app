// @vitest-environment jsdom
/**
 * @file ModeEmptyState.test.tsx
 * @description Empty desktop card show/hide + copy (#140 Slice A)
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { THEMES } from "../constants";
import { ModeEmptyState, MODE_EMPTY_COPY } from "./ModeEmptyState";

const theme = THEMES.matrix;

describe("ModeEmptyState (#140 A1)", () => {
  it("renders INVEST empty card with Design copy + testid", () => {
    render(<ModeEmptyState theme={theme} mode="invest" />);
    expect(screen.getByTestId("mode-empty-invest")).toBeTruthy();
    expect(screen.getByText("INVEST")).toBeTruthy();
    expect(
      screen.getByText("Pick a tool above — Price, Swap, News, Portfolio, or Perps.")
    ).toBeTruthy();
  });

  it("renders DEV empty card with locked empty copy (#162)", () => {
    render(<ModeEmptyState theme={theme} mode="dev" />);
    expect(screen.getByTestId("mode-empty-dev")).toBeTruthy();
    expect(screen.getByText("DEV")).toBeTruthy();
    expect(screen.getByText("No tools in this mode yet.")).toBeTruthy();
    expect(MODE_EMPTY_COPY.dev.body).toBe("No tools in this mode yet.");
    expect(MODE_EMPTY_COPY.dev.body.toLowerCase()).not.toMatch(/coming soon/);
  });

  it("renders FORENSIC empty card", () => {
    render(<ModeEmptyState theme={theme} mode="forensic" />);
    expect(screen.getByTestId("mode-empty-forensic")).toBeTruthy();
    expect(screen.getByText(MODE_EMPTY_COPY.forensic.body)).toBeTruthy();
  });

  it("uses panel card language (border + cardBg classes)", () => {
    const { container } = render(
      <ModeEmptyState theme={theme} mode="invest" />
    );
    const el = container.querySelector("[data-testid=mode-empty-invest]");
    expect(el?.className).toMatch(/border/);
    expect(el?.className).toContain(theme.cardBg);
  });
});
