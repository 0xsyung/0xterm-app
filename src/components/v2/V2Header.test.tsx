/** @vitest-environment jsdom */
/**
 * @file V2Header.test.tsx
 * @description #312 — no header network chip; wallet cluster = Connect or account+Disconnect
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import V2Header from "./V2Header";
import { FINANCE_THEME } from "./theme";

const base = {
  theme: FINANCE_THEME,
  nav: "holdings" as const,
  onNavChange: vi.fn(),
  onWalletOpen: vi.fn(),
  onDisconnect: vi.fn()
};

describe("V2Header (#312 drop network chip)", () => {
  it("omits v2-network-chip; disconnected cluster is Connect only", () => {
    render(
      <V2Header
        {...base}
        walletAddress={null}
        isWalletConnected={false}
      />
    );
    const header = screen.getByTestId("v2-header");
    const cluster = screen.getByTestId("v2-wallet-cluster");
    expect(within(header).queryByTestId("v2-network-chip")).toBeNull();
    expect(within(cluster).queryByTestId("v2-network-chip")).toBeNull();
    expect(within(cluster).getByTestId("v2-connect")).toBeTruthy();
    expect(within(cluster).queryByTestId("v2-account")).toBeNull();
    expect(within(cluster).queryByTestId("v2-disconnect")).toBeNull();
    expect(cluster.className).toMatch(/ml-auto/);
    expect(cluster.className).toMatch(/gap-1\.5/);
    expect(within(cluster).getByTestId("v2-connect").className).toMatch(
      /btn-hug|btn-md/
    );
  });

  it("connected cluster is truncated address + Disconnect; still no chip", () => {
    render(
      <V2Header
        {...base}
        walletAddress="0x18aE8E344728339b70258d13B73D28B95061cEcA"
        isWalletConnected
      />
    );
    const cluster = screen.getByTestId("v2-wallet-cluster");
    expect(within(cluster).queryByTestId("v2-network-chip")).toBeNull();
    expect(screen.queryByTestId("v2-network-chip")).toBeNull();
    expect(within(cluster).getByTestId("v2-account").textContent).toBe(
      "0x18aE…cEcA"
    );
    expect(within(cluster).getByTestId("v2-disconnect")).toBeTruthy();
    expect(within(cluster).queryByTestId("v2-connect")).toBeNull();
  });
});
