// @vitest-environment jsdom
/**
 * @file PortfolioPanel.test.tsx
 * @description Shared PORTFOLIO panel + forensic write lock (#167)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import PortfolioPanel, { type PortfolioFetchResult } from "./PortfolioPanel";

const theme = THEMES.matrix;

const emptyOk: PortfolioFetchResult = {
  ok: true,
  data: { holdings: [] }
};

describe("PortfolioPanel", () => {
  it("invest surface shows RECORD SNAPSHOT", async () => {
    const onFetch = vi.fn(async () => emptyOk);
    render(
      <PortfolioPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        surface="invest"
        onRecordSnapshot={vi.fn()}
        isConnected
      />
    );
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    expect(screen.getByTestId("portfolio-record-snapshot")).toBeTruthy();
    expect(screen.getByTestId("portfolio-snapshot-banner").textContent).toMatch(
      /NO SNAPSHOT/
    );
  });

  it("forensic surface hides RECORD SNAPSHOT write CTA", async () => {
    const onFetch = vi.fn(async () => emptyOk);
    render(
      <PortfolioPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        surface="forensic"
        onRecordSnapshot={vi.fn()}
        isConnected
      />
    );
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    expect(screen.queryByTestId("portfolio-record-snapshot")).toBeNull();
    expect(screen.getByTestId("portfolio-panel").getAttribute("data-surface")).toBe(
      "forensic"
    );
  });

  it("disconnected shows Wallet not connected", async () => {
    render(
      <PortfolioPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={vi.fn()}
        isConnected={false}
      />
    );
    await waitFor(() =>
      expect(screen.getByTestId("portfolio-error").textContent).toBe(
        "Wallet not connected."
      )
    );
  });

  it("shared invest CHAT gutter on panel root (#227)", async () => {
    const onFetch = vi.fn(async () => emptyOk);
    render(
      <PortfolioPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        surface="invest"
        isConnected
      />
    );
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    const panel = screen.getByTestId("portfolio-panel");
    expect(panel.className).toMatch(/\bpr-16\b/);
    expect(panel.className).toMatch(/\bpb-16\b/);
  });
});
