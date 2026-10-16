// @vitest-environment jsdom
/**
 * @file AddLiqPanel.test.tsx
 * @description Smoke tests for INVEST DEX ADD LIQ panel (#168)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import AddLiqPanel, {
  buildAddLiqCli,
  canPreviewAddLiq
} from "./AddLiqPanel";
import {
  DEFAULT_SWAP_SLIPPAGE,
  SWAP_SLIPPAGE_QUICK
} from "./SwapPanel";
import { resolveActionChain, formatActionNetworkLine } from "../actionNetworks";

const theme = THEMES.matrix;

describe("buildAddLiqCli / canPreviewAddLiq", () => {
  it("builds CLI without slippage (CLI path)", () => {
    expect(
      buildAddLiqCli({
        tokenA: "ETH",
        tokenB: "USDC",
        amountA: "1",
        amountB: "2000",
        feeTier: 3000
      })
    ).toBe("addliq ETH USDC 1 2000 3000");
  });

  it("defaults slippage gate to Swap 0.5", () => {
    expect(DEFAULT_SWAP_SLIPPAGE).toBe(0.5);
    expect([...SWAP_SLIPPAGE_QUICK]).toEqual([0.1, 0.5, 1, 3]);
    expect(
      canPreviewAddLiq({
        tokenA: "ETH",
        tokenB: "USDC",
        amountA: "1",
        amountB: "2",
        slippage: DEFAULT_SWAP_SLIPPAGE,
        walletConnected: true
      })
    ).toBe(true);
  });
});

describe("AddLiqPanel #156 network + slippage", () => {
  it("resolveActionChain addliq honors override", () => {
    const r = resolveActionChain("addliq", 1, { addliq: 8453 });
    expect(r.usedOverride).toBe(true);
    expect(formatActionNetworkLine(r.chainId, r.usedOverride)).toBe(
      "on BASE (override)"
    );
  });

  it("defaults slippage 0.5 with quick chips", () => {
    render(
      <AddLiqPanel
        theme={theme}
        onClose={vi.fn()}
        onRun={vi.fn()}
        walletConnected
      />
    );
    expect((screen.getByTestId("addliq-slippage") as HTMLInputElement).value).toBe(
      "0.5"
    );
    expect(screen.getByTestId("addliq-slippage-quick").querySelectorAll("button").length).toBe(
      4
    );
  });

  it("shows override network line", () => {
    render(
      <AddLiqPanel
        theme={theme}
        onClose={vi.fn()}
        onRun={vi.fn()}
        walletConnected
        networkLine="on BASE (override)"
      />
    );
    expect(screen.getByTestId("addliq-network").textContent).toMatch(
      /override/
    );
  });

  it("PREVIEW mounts widget when fields valid", async () => {
    const onRun = vi.fn().mockResolvedValue({
      ok: true,
      component: <div data-testid="addliq-widget">WIDGET</div>
    });
    render(
      <AddLiqPanel
        theme={theme}
        onClose={vi.fn()}
        onRun={onRun}
        walletConnected
      />
    );
    fireEvent.change(screen.getByTestId("addliq-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("addliq-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.change(screen.getByTestId("addliq-amount-a"), {
      target: { value: "1" }
    });
    fireEvent.change(screen.getByTestId("addliq-amount-b"), {
      target: { value: "2000" }
    });
    fireEvent.click(screen.getByTestId("addliq-preview"));
    await waitFor(() => expect(onRun).toHaveBeenCalled());
    expect(onRun.mock.calls[0][0].slippage).toBe(0.5);
    expect(screen.getByTestId("addliq-widget")).toBeTruthy();
  });
});
