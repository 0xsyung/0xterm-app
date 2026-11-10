/** @vitest-environment jsdom */
/**
 * @file HoldingsScreen.positionsPlacement.test.tsx
 * @description #320 — Positions sits under 24h, start-aligned hug, never far-right
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FINANCE_THEME } from "../theme";
import { V2Provider } from "../V2Context";
import HoldingsScreen, { type V2HoldingRow } from "./HoldingsScreen";

const HOLDINGS: V2HoldingRow[] = [
  {
    symbol: "WETH",
    chainId: 1,
    chainLabel: "Ethereum",
    qty: "1.5",
    valueUsd: 4500,
    change24h: 1.25,
    pctOfPortfolio: 100
  }
];

function renderHoldings({
  isConnected = true,
  holdings = HOLDINGS
}: {
  isConnected?: boolean;
  holdings?: V2HoldingRow[];
} = {}) {
  return render(
    <V2Provider>
      <HoldingsScreen
        theme={FINANCE_THEME}
        isConnected={isConnected}
        holdings={holdings}
        onConnect={() => undefined}
      />
    </V2Provider>
  );
}

describe("HoldingsScreen Positions placement (#320)", () => {
  afterEach(() => cleanup());

  it("stacks Positions under 24h, start-aligned hug, not end-justified", () => {
    renderHoldings();

    const header = screen.getByTestId("v2-holdings-header");
    expect(header.className).toMatch(/\bflex\b/);
    expect(header.className).toMatch(/\bflex-col\b/);
    expect(header.className).toMatch(/\bitems-start\b/);
    expect(header.className).not.toMatch(/justify-between/);
    expect(header.className).not.toMatch(/ml-auto/);
    expect(header.className).not.toMatch(/justify-end/);
    expect(header.className).not.toMatch(/items-end/);

    const portfolio = within(header).getByText("Portfolio");
    const total = screen.getByTestId("v2-holdings-total");
    const change = screen.getByTestId("v2-holdings-change");
    const positions = screen.getByTestId("v2-holdings-positions-link");
    const chips = screen.getByTestId("v2-chain-chips");

    expect(portfolio.className).toMatch(/text-\[10px\]/);
    expect(portfolio.className).toMatch(/uppercase/);
    expect(total.className).toMatch(/\btext-2xl\b/);
    expect(change.className).toMatch(/\btext-sm\b/);
    expect(change.textContent).toMatch(/^24h /);
    expect(positions.textContent).toBe("Positions");

    expect(portfolio.compareDocumentPosition(total) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(total.compareDocumentPosition(change) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(change.compareDocumentPosition(positions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(positions.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Chip is not a sibling of the caption or the dollar figure.
    expect(portfolio.parentElement).not.toBe(positions.parentElement);
    expect(total.parentElement).not.toBe(positions.parentElement);
    expect(change.parentElement).toBe(total.parentElement);

    expect(positions.className).toMatch(/\bself-start\b/);
    expect(positions.className).toMatch(/\bw-fit\b/);
    expect(positions.className).toMatch(/min-h-\[44px\]/);
    expect(positions.className).toMatch(/\bbtn-hug\b/);
    expect(positions.className).toMatch(/\bbtn-secondary\b/);
    expect(positions.className).not.toMatch(/\bbtn-block\b/);
    expect(positions.className.split(/\s+/)).not.toContain("w-full");
    expect(positions.className).not.toMatch(/ml-auto/);
  });

  it("keeps Positions empty copy and Back; no tab strip", () => {
    renderHoldings();

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByText("Holdings|Positions")).toBeNull();

    fireEvent.click(screen.getByTestId("v2-holdings-positions-link"));

    const view = screen.getByTestId("v2-holdings-positions");
    expect(view).toBeTruthy();
    expect(screen.getByTestId("v2-positions-empty").textContent).toBe(
      "No open positions."
    );
    expect(within(view).getByRole("button", { name: /Back/ })).toBeTruthy();
    expect(screen.queryByTestId("v2-holdings-positions-link")).toBeNull();
    expect(screen.queryByTestId("v2-holdings-list")).toBeNull();
  });

  it("omits Positions on the disconnected Connect empty state", () => {
    renderHoldings({ isConnected: false, holdings: [] });

    const screenRoot = screen.getByTestId("v2-holdings");
    expect(screen.getByTestId("v2-holdings-connect")).toBeTruthy();
    expect(screenRoot.textContent).toMatch(/Connect a wallet/i);
    expect(screen.queryByTestId("v2-holdings-positions-link")).toBeNull();
    expect(screen.queryByTestId("v2-holdings-header")).toBeNull();
    expect(screen.queryByTestId("v2-holdings-total")).toBeNull();
  });
});
