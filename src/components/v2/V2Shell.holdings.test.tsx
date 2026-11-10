/** @vitest-environment jsdom */
/**
 * @file V2Shell.holdings.test.tsx
 * @description Live Holdings wiring: empty when disconnected, rows when fetch returns WETH
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { V2HoldingRow } from "./screens/HoldingsScreen";
import type { V2HoldingsFetcher } from "./holdingsGateway";

const openMock = vi.fn(async () => undefined);
const closeMock = vi.fn(async () => undefined);
const disconnectMock = vi.fn();
const loadV2HoldingsMock = vi.fn<V2HoldingsFetcher>(async () => []);

let accountState: {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chainId: number | undefined;
} = {
  address: undefined,
  isConnected: false,
  chainId: undefined
};

const wagmiConfigStub = {};

vi.mock("wagmi", () => ({
  useAccount: () => accountState,
  useDisconnect: () => ({ disconnect: disconnectMock }),
  useConfig: () => wagmiConfigStub
}));

vi.mock("@reown/appkit/react", () => ({
  useAppKit: () => ({ open: openMock, close: closeMock })
}));

vi.mock("./holdingsGateway", () => ({
  loadV2Holdings: (...args: Parameters<V2HoldingsFetcher>) =>
    loadV2HoldingsMock(...args)
}));

import V2Shell from "./V2Shell";

describe("V2Shell live Holdings wiring", () => {
  beforeEach(() => {
    openMock.mockClear();
    closeMock.mockClear();
    disconnectMock.mockClear();
    loadV2HoldingsMock.mockReset();
    loadV2HoldingsMock.mockResolvedValue([]);
    accountState = {
      address: undefined,
      isConnected: false,
      chainId: undefined
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the disconnected Connect CTA and does not fetch holdings", () => {
    render(<V2Shell />);
    expect(screen.getByTestId("v2-holdings-connect")).toBeTruthy();
    expect(screen.getByTestId("v2-holdings").textContent).toMatch(
      /Connect a wallet/i
    );
    expect(loadV2HoldingsMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("v2-holdings-list")).toBeNull();
  });

  it("renders WETH with qty + USD when the live fetch returns it", async () => {
    accountState = {
      address: "0x1111111111111111111111111111111111111111",
      isConnected: true,
      chainId: 1
    };
    loadV2HoldingsMock.mockResolvedValue([
      {
        symbol: "WETH",
        chainId: 1,
        chainLabel: "Ethereum",
        qty: "1.5",
        valueUsd: 3000,
        change24h: 1.1,
        pctOfPortfolio: 100
      }
    ]);
    render(<V2Shell />);
    await waitFor(() => {
      expect(loadV2HoldingsMock).toHaveBeenCalledTimes(1);
    });
    expect(loadV2HoldingsMock.mock.calls[0]?.[0]).toBe(
      "0x1111111111111111111111111111111111111111"
    );
    const list = await screen.findByTestId("v2-holdings-list");
    expect(list.textContent).toContain("WETH");
    expect(list.textContent).toContain("1.5");
    expect(list.textContent).toMatch(/3,000|3000/);
    expect(screen.queryByTestId("v2-holdings-connect")).toBeNull();
  });

  it("stays on an honest empty list when the live fetch returns no rows", async () => {
    accountState = {
      address: "0x1111111111111111111111111111111111111111",
      isConnected: true,
      chainId: 1
    };
    render(<V2Shell />);
    await waitFor(() => {
      expect(loadV2HoldingsMock).toHaveBeenCalled();
    });
    expect(screen.getByTestId("v2-holdings-empty")).toBeTruthy();
    expect(screen.queryByTestId("v2-holdings-connect")).toBeNull();
  });
});
