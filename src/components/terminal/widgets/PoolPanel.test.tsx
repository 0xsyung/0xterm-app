// @vitest-environment jsdom
/**
 * @file PoolPanel.test.tsx
 * @description Shared pair + LOOKUP/CREATE/ADD LIQ stacked (#220)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import PoolPanel from "./PoolPanel";

const theme = THEMES.matrix;

describe("PoolPanel (#220)", () => {
  it("renders POOL header, microcopy, PAIR/LOOKUP/CREATE/ADD LIQ", () => {
    render(
      <PoolPanel
        theme={theme}
        onClose={vi.fn()}
        onLookup={vi.fn()}
        onCreate={vi.fn()}
        onAddLiq={vi.fn()}
        walletConnected
        frameless
      />
    );
    expect(screen.getByTestId("pool-panel")).toBeTruthy();
    expect(screen.getByText("POOL")).toBeTruthy();
    expect(screen.getByTestId("pool-microcopy").textContent).toMatch(
      /Lookup · create if missing · add liq/
    );
    expect(screen.getByText("PAIR")).toBeTruthy();
    expect(screen.getByTestId("pool-lookup")).toBeTruthy();
    expect(screen.getByTestId("pool-create")).toBeTruthy();
    expect(screen.getByTestId("pool-addliq")).toBeTruthy();
  });

  it("shared TOKEN A/B updates all previews", () => {
    render(
      <PoolPanel
        theme={theme}
        onClose={vi.fn()}
        onLookup={vi.fn()}
        onCreate={vi.fn()}
        onAddLiq={vi.fn()}
        walletConnected
        frameless
      />
    );
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.change(screen.getByTestId("pool-amount-a"), {
      target: { value: "1" }
    });
    fireEvent.change(screen.getByTestId("pool-amount-b"), {
      target: { value: "2000" }
    });
    expect(screen.getByTestId("pool-lookup-preview").textContent).toMatch(
      /getpool ETH USDC/
    );
    expect(screen.getByTestId("pool-create-preview").textContent).toMatch(
      /createpool ETH USDC/
    );
    expect(screen.getByTestId("pool-addliq-preview").textContent).toMatch(
      /addliq ETH USDC 1 2000/
    );
  });

  it("LOOKUP missing sets create-below cue", async () => {
    const onLookup = vi.fn().mockResolvedValue({
      ok: true,
      missing: true,
      component: <div data-testid="missing-card">NO POOL</div>
    });
    render(
      <PoolPanel
        theme={theme}
        onClose={vi.fn()}
        onLookup={onLookup}
        onCreate={vi.fn()}
        onAddLiq={vi.fn()}
        walletConnected
        frameless
      />
    );
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.click(screen.getByTestId("pool-lookup"));
    await waitFor(() => {
      expect(screen.getByTestId("pool-missing-cue").textContent).toMatch(
        /Pool not found — create below/
      );
    });
  });

  it("CREATE success sets add-liq cue", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      ok: true,
      component: <div data-testid="create-widget">create ok</div>
    });
    render(
      <PoolPanel
        theme={theme}
        onClose={vi.fn()}
        onLookup={vi.fn()}
        onCreate={onCreate}
        onAddLiq={vi.fn()}
        walletConnected
        frameless
      />
    );
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.click(screen.getByTestId("pool-create"));
    await waitFor(() => {
      expect(screen.getByTestId("pool-created-cue").textContent).toMatch(
        /Pool created — add liquidity below/
      );
    });
  });

  it("Escape closes", () => {
    const onClose = vi.fn();
    render(
      <PoolPanel
        theme={theme}
        onClose={onClose}
        onLookup={vi.fn()}
        onCreate={vi.fn()}
        onAddLiq={vi.fn()}
        frameless
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
