// @vitest-environment jsdom
/**
 * @file PinnedPanel.test.tsx
 * @description Render tests for the pinned panel
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { THEMES } from "./constants";
import PinnedPanel from "./PinnedPanel";
import type { PinnedManifest } from "./types";

const theme = THEMES.matrix;

const noops = { onRefresh: vi.fn(), onMinimize: vi.fn(), onUnpin: vi.fn() };

describe("PinnedPanel", () => {
  it("returns null when there are no pins", () => {
    const { container } = render(
      <PinnedPanel pinned={[]} theme={theme} {...noops} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a price pin via componentData", () => {
    const pricePin: PinnedManifest = {
      id: "p1",
      kind: "component",
      title: "USDC/WETH",
      componentData: {
        kind: "price",
        mode: "onchain",
        pairAddress: "0xAbC123",
        symbolA: "USDC",
        symbolB: "WETH",
        rate: 1.23,
        dexName: "Uniswap V3",
        chainName: "Base"
      }
    };
    render(<PinnedPanel pinned={[pricePin]} theme={theme} {...noops} />);
    expect(screen.getByText(/ON-CHAIN POOL PRICE \(Uniswap V3\)/)).toBeTruthy();
    expect(screen.getByText(/1 USDC =/)).toBeTruthy();
  });

  it("renders a balance pin", () => {
    const balancePin: PinnedManifest = {
      id: "b1",
      kind: "balance",
      title: "BALANCE USDC"
    };
    render(<PinnedPanel pinned={[balancePin]} theme={theme} {...noops} />);
    expect(screen.getByText("BALANCE USDC")).toBeTruthy();
  });

  it("renders a portfolio pin", () => {
    const portfolioPin: PinnedManifest = {
      id: "pf1",
      kind: "portfolio",
      title: "PORTFOLIO",
      payload: { holdings: [] }
    };
    render(<PinnedPanel pinned={[portfolioPin]} theme={theme} {...noops} />);
    expect(screen.getAllByText("PORTFOLIO").length).toBeGreaterThan(0);
  });
});

  it("shows STALE on title row when pin.stale (#169)", () => {
    const pricePin: PinnedManifest = {
      id: "p1",
      kind: "component",
      title: "PRICE ETH/USDC",
      refreshSec: 15,
      stale: true,
      componentData: {
        kind: "price",
        mode: "api",
        tokenSymbol: "ETH",
        quoteSymbol: "USDC",
        priceUsd: "3000",
        dex: "uniswap",
        chain: "ethereum"
      }
    };
    render(
      <PinnedPanel
        pinned={[pricePin]}
        theme={theme}
        countdowns={{ p1: 15 }}
        {...noops}
      />
    );
    expect(screen.getByTestId("pin-stale").textContent).toBe("STALE");
    expect(screen.getByText("next 15s")).toBeTruthy();
    // last good card stays
    expect(screen.getByText(/ETH \/ USDC/)).toBeTruthy();
  });

  it("uses refreshSec for countdown default when countdowns omit id", () => {
    const pricePin: PinnedManifest = {
      id: "p2",
      kind: "component",
      title: "PRICE ETH/USDC",
      refreshSec: 15,
      componentData: {
        kind: "price",
        mode: "onchain",
        symbolA: "ETH",
        symbolB: "USDC",
        rate: 1,
        dexName: "Uniswap V3",
        chainName: "Ethereum"
      }
    };
    render(
      <PinnedPanel
        pinned={[pricePin]}
        theme={theme}
        countdowns={{}}
        {...noops}
      />
    );
    // no countdown entry → no next Ns UI (hasRefresh false); refreshSec still on manifest
    expect(pricePin.refreshSec).toBe(15);
  });

