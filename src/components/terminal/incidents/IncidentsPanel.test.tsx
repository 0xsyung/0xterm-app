// @vitest-environment jsdom
/**
 * @file IncidentsPanel.test.tsx
 * @description Soft ACK #268 — list/detail Soft-chrome + source links + pagination
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { THEMES } from "../constants";
import IncidentsPanel from "./IncidentsPanel";
import { incidents } from "./corpus";
import type { Incident } from "./types";

const theme = THEMES.matrix;

function makeExtra(n: number): Incident[] {
  return Array.from({ length: n }, (_, i) => ({
    ...incidents[0]!,
    id: `extra-incident-${i}`,
    title: `Extra incident ${i}`
  }));
}

describe("IncidentsPanel (#268)", () => {
  it("renders list with Binance row, status badge, and no pagination for 1 item", () => {
    const onClose = vi.fn();
    render(<IncidentsPanel theme={theme} onClose={onClose} />);
    expect(screen.getByTestId("incidents-panel")).toBeTruthy();
    expect(screen.getByTestId("incident-list")).toBeTruthy();
    expect(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    ).toBeTruthy();
    expect(
      screen.getByTestId("incident-status-binance-hot-wallet-2026-10-30").textContent
    ).toMatch(/ACTIVE/i);
    expect(screen.queryByTestId("incident-pagination")).toBeNull();
  });

  it("opens detail with Soft sections and source URLs; BACK returns to list", () => {
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    const detail = screen.getByTestId("incident-detail");
    expect(detail).toBeTruthy();
    expect(screen.getByTestId("incident-section-what")).toBeTruthy();
    expect(screen.getByTestId("incident-section-timeline")).toBeTruthy();
    expect(screen.getByTestId("incident-section-money")).toBeTruthy();
    expect(screen.getByTestId("incident-sources-index")).toBeTruthy();
    const links = within(detail).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(a.getAttribute("href")?.startsWith("https://")).toBe(true);
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
    }
    fireEvent.click(screen.getByTestId("incident-back"));
    expect(screen.getByTestId("incident-list")).toBeTruthy();
    expect(screen.queryByTestId("incident-detail")).toBeNull();
  });

  it("Escape on detail returns to list; Escape on list closes panel", () => {
    const onClose = vi.fn();
    render(<IncidentsPanel theme={theme} onClose={onClose} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    expect(screen.getByTestId("incident-detail")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("incident-list")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows PREV/NEXT Soft-chrome when corpus exceeds page size 8", () => {
    const corpus = [...incidents, ...makeExtra(10)];
    render(
      <IncidentsPanel theme={theme} onClose={vi.fn()} corpus={corpus} pageSize={8} />
    );
    expect(screen.getByTestId("incident-pagination")).toBeTruthy();
    expect(screen.getByTestId("incident-next")).toBeTruthy();
    fireEvent.click(screen.getByTestId("incident-next"));
    expect(screen.getByText(/page 2/i)).toBeTruthy();
  });

  it("money Soft-figures expose confirmed vs estimate labels", () => {
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    const money = screen.getByTestId("incident-section-money");
    expect(within(money).getAllByText(/confirmed/i).length).toBeGreaterThan(0);
    expect(within(money).getAllByText(/estimate/i).length).toBeGreaterThan(0);
  });

  it("renders CONTAINED/RESOLVED/UNRESOLVED badge tones and invalid date fallback", () => {
    const variants: Incident[] = [
      { ...incidents[0]!, id: "a", status: "CONTAINED", title: "Contained", occurredAt: "not-a-date" },
      { ...incidents[0]!, id: "b", status: "RESOLVED", title: "Resolved", occurredAt: "2026-01-01T00:00:00.000Z" },
      { ...incidents[0]!, id: "c", status: "UNRESOLVED", title: "Unresolved", occurredAt: "2026-01-02T00:00:00.000Z" }
    ];
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} corpus={variants} />);
    expect(screen.getByTestId("incident-status-a").textContent).toMatch(/CONTAINED/);
    expect(screen.getByTestId("incident-status-b").textContent).toMatch(/RESOLVED/);
    expect(screen.getByTestId("incident-status-c").textContent).toMatch(/UNRESOLVED/);
    expect(screen.getByTestId("incident-row-a").textContent).toContain("not-a-date");
  });

  it("PREV Soft-chrome returns to page 1; empty corpus Soft-copy", () => {
    const corpus = [...incidents, ...makeExtra(10)];
    render(
      <IncidentsPanel theme={theme} onClose={vi.fn()} corpus={corpus} pageSize={8} />
    );
    fireEvent.click(screen.getByTestId("incident-next"));
    fireEvent.click(screen.getByTestId("incident-prev"));
    expect(screen.getByText(/page 1/i)).toBeTruthy();
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} corpus={[]} />);
    expect(screen.getByText(/No incident reports yet/i)).toBeTruthy();
  });

  it("source Soft-cite stopPropagation does not leave list when clicked on detail", () => {
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    const cite = screen.getAllByTestId(/incident-source-/)[0];
    fireEvent.click(cite);
    expect(screen.getByTestId("incident-detail")).toBeTruthy();
  });

  it("DigPanelShell Escape path clears detail via smart onClose", () => {
    const onClose = vi.fn();
    render(<IncidentsPanel theme={theme} onClose={onClose} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    // DigPanelShell listens on window keydown
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("incident-list")).toBeTruthy();
  });
});
