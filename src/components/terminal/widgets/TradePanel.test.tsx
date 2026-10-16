// @vitest-environment jsdom
/**
 * @file TradePanel.test.tsx
 * @description Shared pair + stacked quote/swap for INVEST TRADE (#219)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import { PRICE_PIN_REFRESH_SEC } from "../helpers";
import { TICKER_REFRESH_SEC } from "../ticker";
import TradePanel from "./TradePanel";

const theme = THEMES.matrix;

describe("TradePanel (#219)", () => {
  it("renders TRADE header, microcopy, PAIR/QUOTE/SWAP sections", () => {
    render(
      <TradePanel
        theme={theme}
        onClose={vi.fn()}
        onRunPrice={vi.fn()}
        onRunSwap={vi.fn()}
        frameless
      />
    );
    expect(screen.getByTestId("trade-panel")).toBeTruthy();
    expect(screen.getByText("TRADE")).toBeTruthy();
    expect(screen.getByTestId("trade-microcopy").textContent).toMatch(
      /Check price · then swap — same pair/
    );
    expect(screen.getByText("PAIR")).toBeTruthy();
    expect(screen.getByText("QUOTE")).toBeTruthy();
    expect(screen.getByText("SWAP")).toBeTruthy();
    expect(screen.getByTestId("trade-run-price").textContent).toMatch(/RUN PRICE/);
    expect(screen.getByTestId("trade-run-swap").textContent).toMatch(/RUN SWAP/);
  });

  it("shared FROM/TO updates both price and swap previews", () => {
    render(
      <TradePanel
        theme={theme}
        onClose={vi.fn()}
        onRunPrice={vi.fn()}
        onRunSwap={vi.fn()}
        frameless
      />
    );
    fireEvent.change(screen.getByTestId("trade-from"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("trade-to"), {
      target: { value: "USDC" }
    });
    fireEvent.change(screen.getByTestId("trade-amount"), {
      target: { value: "1" }
    });
    expect(screen.getByTestId("trade-price-preview").textContent).toMatch(
      /price ETH USDC/
    );
    expect(screen.getByTestId("trade-swap-preview").textContent).toMatch(
      /swap 1 ETH USDC/
    );
  });

  it("changing amount does not clear a successful quote card", async () => {
    const onRunPrice = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        kind: "price",
        mode: "api",
        tokenSymbol: "ETH",
        quoteSymbol: "USDC",
        price: "2500",
        chain: "base",
        dex: "api"
      }
    });
    render(
      <TradePanel
        theme={theme}
        onClose={vi.fn()}
        onRunPrice={onRunPrice}
        onRunSwap={vi.fn()}
        frameless
      />
    );
    fireEvent.change(screen.getByTestId("trade-from"), {
      target: { value: "ETH" }
    });
    // API source: BASE only needed; pick API
    fireEvent.click(screen.getByRole("button", { name: /^API$/i }));
    fireEvent.click(screen.getByTestId("trade-run-price"));
    await waitFor(() => {
      expect(screen.getByTestId("trade-price-result")).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId("trade-amount"), {
      target: { value: "2" }
    });
    expect(screen.getByTestId("trade-price-result")).toBeTruthy();
  });

  it("RUN SWAP uses shared pair + fee", async () => {
    const onRunSwap = vi.fn().mockResolvedValue({
      ok: true,
      component: <div data-testid="fake-swap-widget">swap ok</div>
    });
    render(
      <TradePanel
        theme={theme}
        onClose={vi.fn()}
        onRunPrice={vi.fn()}
        onRunSwap={onRunSwap}
        frameless
      />
    );
    fireEvent.change(screen.getByTestId("trade-from"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("trade-to"), {
      target: { value: "USDC" }
    });
    fireEvent.change(screen.getByTestId("trade-amount"), {
      target: { value: "1" }
    });
    fireEvent.click(screen.getByTestId("trade-run-swap"));
    await waitFor(() => {
      expect(onRunSwap).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: "1",
          fromToken: "ETH",
          toToken: "USDC",
          slippage: 0.5,
          feeTier: 3000
        })
      );
    });
    expect(screen.getByTestId("fake-swap-widget")).toBeTruthy();
  });

  it("Escape closes", () => {
    const onClose = vi.fn();
    render(
      <TradePanel
        theme={theme}
        onClose={onClose}
        onRunPrice={vi.fn()}
        onRunSwap={vi.fn()}
        frameless
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("pin cadence floor still 15s (#169)", () => {
    expect(PRICE_PIN_REFRESH_SEC).toBe(15);
    expect(PRICE_PIN_REFRESH_SEC).toBe(TICKER_REFRESH_SEC);
  });
});
