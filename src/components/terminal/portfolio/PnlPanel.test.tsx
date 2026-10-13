// @vitest-environment jsdom
/**
 * @file PnlPanel.test.tsx
 * @description INVEST PNL panel empty gate + reset (#167)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import PnlPanel, { type PnlFetchResult } from "./PnlPanel";

const theme = THEMES.matrix;

describe("PnlPanel", () => {
  it("empty gate mentions SNAPSHOT tool", async () => {
    const onFetch = vi.fn(async (): Promise<PnlFetchResult> => ({
      ok: false,
      empty: true,
      error: "No snapshot found. Run SNAPSHOT first to establish a P/L baseline."
    }));
    render(
      <PnlPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        isConnected
      />
    );
    await waitFor(() => expect(screen.getByTestId("pnl-empty")).toBeTruthy());
    expect(screen.getByTestId("pnl-empty").textContent).toMatch(/SNAPSHOT/);
    expect(screen.getByTestId("pnl-empty").textContent).not.toMatch(
      /Run 'snapshot'/
    );
  });

  it("exposes RESET BASELINE when handler provided", async () => {
    const onFetch = vi.fn(async (): Promise<PnlFetchResult> => ({
      ok: false,
      empty: true,
      error: "x"
    }));
    render(
      <PnlPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        onResetBaseline={vi.fn()}
        isConnected
      />
    );
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    expect(screen.getByTestId("pnl-reset-baseline")).toBeTruthy();
  });
});
