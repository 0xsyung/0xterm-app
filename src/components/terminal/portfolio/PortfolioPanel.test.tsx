// @vitest-environment jsdom
/**
 * @file PortfolioPanel.test.tsx
 * @description Merged PORTFOLIO panel + forensic baseline lock (#253)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import PortfolioPanel, { type PortfolioFetchResult } from "./PortfolioPanel";

const theme = THEMES.matrix;

const emptyOk: PortfolioFetchResult = {
  ok: true,
  data: { holdings: [] }
};

const withSnap: PortfolioFetchResult = {
  ok: true,
  data: {
    holdings: [
      {
        chainName: "Ethereum",
        chainId: 1,
        symbol: "ETH",
        type: "native",
        balance: "1",
        priceUsd: 3000,
        valueUsd: 3000,
        isTestnet: false,
        change24h: null,
        priceSource: "dex"
      }
    ],
    snapshot: {
      "1:ETH": { price: 2800, balance: "1" }
    },
    snapshotLabel: "now",
    snapshotTime: 1_700_000_000_000
  }
};

describe("PortfolioPanel (#253 merge)", () => {
  it("invest surface shows baseline chrome + empty gate (no hop to SNAPSHOT tile)", async () => {
    const onFetch = vi.fn(async () => emptyOk);
    render(
      <PortfolioPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        surface="invest"
        onRecordSnapshot={vi.fn()}
        onResetBaseline={vi.fn()}
        isConnected
      />
    );
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    expect(screen.getByTestId("portfolio-baseline")).toBeTruthy();
    expect(screen.getByTestId("portfolio-record-snapshot")).toBeTruthy();
    expect(screen.getByTestId("portfolio-reset-baseline")).toBeTruthy();
    expect(screen.getByTestId("portfolio-baseline-label")).toBeTruthy();
    expect(screen.getByTestId("portfolio-snapshot-banner").textContent).toMatch(
      /NO SNAPSHOT/
    );
    expect(screen.getByTestId("portfolio-snapshot-banner").textContent).not.toMatch(
      /INVEST → SNAPSHOT/
    );
    expect(screen.getByTestId("portfolio-empty-gate").textContent).toMatch(
      /RECORD SNAPSHOT/
    );
    expect(screen.queryByTestId("portfolio-summary")).toBeNull();
  });

  it("invest surface shows summary strip when snapshot exists", async () => {
    const onFetch = vi.fn(async () => withSnap);
    render(
      <PortfolioPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        surface="invest"
        onRecordSnapshot={vi.fn()}
        onResetBaseline={vi.fn()}
        isConnected
      />
    );
    await waitFor(() => expect(screen.getByTestId("portfolio-summary")).toBeTruthy());
    expect(screen.getByTestId("portfolio-summary").textContent).toMatch(/NET USD/);
    expect(screen.getByTestId("portfolio-summary").textContent).toMatch(/P\/L \(PRICE\)/);
    expect(screen.getByTestId("portfolio-summary").textContent).toMatch(/BAL Δ/);
    expect(screen.queryByTestId("portfolio-empty-gate")).toBeNull();
  });

  it("forensic surface hides baseline writer + summary strip", async () => {
    const onFetch = vi.fn(async () => withSnap);
    render(
      <PortfolioPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        surface="forensic"
        onRecordSnapshot={vi.fn()}
        onResetBaseline={vi.fn()}
        isConnected
      />
    );
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    expect(screen.queryByTestId("portfolio-baseline")).toBeNull();
    expect(screen.queryByTestId("portfolio-record-snapshot")).toBeNull();
    expect(screen.queryByTestId("portfolio-reset-baseline")).toBeNull();
    expect(screen.queryByTestId("portfolio-summary")).toBeNull();
    expect(screen.getByTestId("portfolio-panel").getAttribute("data-surface")).toBe(
      "forensic"
    );
    // Read-only banner still OK
    expect(screen.getByTestId("portfolio-snapshot-banner").textContent).toMatch(
      /SNAPSHOT:/
    );
  });

  it("RESET BASELINE is two-click confirm", async () => {
    const onReset = vi.fn(async () => ({
      ok: true as const,
      label: "now",
      count: 1,
      time: "t"
    }));
    const onFetch = vi.fn(async () => emptyOk);
    render(
      <PortfolioPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        surface="invest"
        onRecordSnapshot={vi.fn()}
        onResetBaseline={onReset}
        isConnected
      />
    );
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    const btn = screen.getByTestId("portfolio-reset-baseline");
    expect(btn.textContent).toBe("RESET BASELINE");
    fireEvent.click(btn);
    expect(btn.textContent).toBe("CONFIRM RESET BASELINE");
    expect(onReset).not.toHaveBeenCalled();
    fireEvent.click(btn);
    await waitFor(() => expect(onReset).toHaveBeenCalledWith({ label: "now" }));
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

  it("one REFRESH control only (no pnl-refresh)", async () => {
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
    expect(screen.getAllByTestId("portfolio-refresh")).toHaveLength(1);
    expect(screen.queryByTestId("pnl-refresh")).toBeNull();
  });
});
