// @vitest-environment jsdom
/**
 * @file CreatePoolPanel.test.tsx
 * @description Smoke tests for INVEST DEX CREATE POOL panel (#168)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import CreatePoolPanel, {
  buildCreatePoolCli,
  canPreviewCreatePool
} from "./CreatePoolPanel";
import { resolveActionChain, formatActionNetworkLine } from "../actionNetworks";

const theme = THEMES.matrix;

describe("buildCreatePoolCli / canPreviewCreatePool", () => {
  it("builds CLI with fee", () => {
    expect(
      buildCreatePoolCli({ tokenA: "ETH", tokenB: "USDC", feeTier: 500 })
    ).toBe("createpool ETH USDC 500");
  });

  it("requires wallet + distinct tokens", () => {
    expect(
      canPreviewCreatePool({
        tokenA: "ETH",
        tokenB: "USDC",
        walletConnected: true
      })
    ).toBe(true);
    expect(
      canPreviewCreatePool({
        tokenA: "ETH",
        tokenB: "USDC",
        walletConnected: false
      })
    ).toBe(false);
  });
});

describe("CreatePoolPanel #156 network override", () => {
  it("resolveActionChain createpool honors override line", () => {
    const r = resolveActionChain("createpool", 1, { createpool: 8453 });
    expect(r).toEqual({ chainId: 8453, usedOverride: true });
    expect(formatActionNetworkLine(r.chainId, r.usedOverride)).toBe(
      "on BASE (override)"
    );
  });

  it("renders override network line from props", () => {
    render(
      <CreatePoolPanel
        theme={theme}
        onClose={vi.fn()}
        onRun={vi.fn()}
        walletConnected
        networkLine="on BASE (override)"
        dexLine="Uniswap V3 (V3)"
      />
    );
    expect(screen.getByTestId("createpool-network").textContent).toMatch(
      /on BASE \(override\)/
    );
  });

  it("disables PREVIEW when wallet disconnected", () => {
    render(
      <CreatePoolPanel
        theme={theme}
        onClose={vi.fn()}
        onRun={vi.fn()}
        walletConnected={false}
      />
    );
    fireEvent.change(screen.getByTestId("createpool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("createpool-token-b"), {
      target: { value: "USDC" }
    });
    expect(
      (screen.getByTestId("createpool-preview") as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByTestId("createpool-wallet-warn")).toBeTruthy();
  });

  it("PREVIEW calls onRun when wallet connected", async () => {
    const onRun = vi.fn().mockResolvedValue({
      ok: true,
      component: <div data-testid="create-widget">WIDGET</div>
    });
    render(
      <CreatePoolPanel
        theme={theme}
        onClose={vi.fn()}
        onRun={onRun}
        walletConnected
      />
    );
    fireEvent.change(screen.getByTestId("createpool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("createpool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.click(screen.getByTestId("createpool-preview"));
    await waitFor(() => expect(onRun).toHaveBeenCalled());
    expect(screen.getByTestId("create-widget")).toBeTruthy();
  });
});
