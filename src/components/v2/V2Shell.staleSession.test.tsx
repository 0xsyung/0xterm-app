/** @vitest-environment jsdom */
/**
 * @file V2Shell.staleSession.test.tsx
 * @description #310 — disconnect + banner on unsupported restored chain; no AppKit reopen
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { STALE_SESSION_BANNER } from "./staleSession";

const openMock = vi.fn(async () => undefined);
const closeMock = vi.fn(async () => undefined);
const disconnectMock = vi.fn();

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

vi.mock("./holdingsGateway", () => ({
  loadV2Holdings: vi.fn(async () => [])
}));

vi.mock("@reown/appkit/react", () => ({
  useAppKit: () => ({ open: openMock, close: closeMock })
}));

import V2Shell from "./V2Shell";

describe("V2Shell stale session (#310)", () => {
  beforeEach(() => {
    openMock.mockClear();
    closeMock.mockClear();
    disconnectMock.mockClear();
    accountState = {
      address: undefined,
      isConnected: false,
      chainId: undefined
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("does not auto-open AppKit when disconnected (empty-state)", () => {
    render(<V2Shell />);
    expect(screen.getByTestId("v2-shell")).toBeTruthy();
    expect(openMock).not.toHaveBeenCalled();
    expect(disconnectMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("v2-stale-session-banner")).toBeNull();
  });

  it("keeps a healthy mainnet session — no disconnect / banner", () => {
    accountState = {
      address: "0x1111111111111111111111111111111111111111",
      isConnected: true,
      chainId: 1
    };
    render(<V2Shell />);
    expect(disconnectMock).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("v2-stale-session-banner")).toBeNull();
  });

  it("clears stale Sepolia session once: disconnect + close modal + banner", async () => {
    accountState = {
      address: "0x2222222222222222222222222222222222222222",
      isConnected: true,
      chainId: 11155111
    };
    render(<V2Shell />);
    await waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledTimes(1);
    });
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(openMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-stale-session-banner").textContent).toContain(
      "unsupported network"
    );
    expect(screen.getByTestId("v2-stale-session-banner").textContent).toBe(
      STALE_SESSION_BANNER + "Dismiss"
    );
  });

  it("banner dismiss works; clearing is one-shot for the same stale chain", async () => {
    accountState = {
      address: "0x3333333333333333333333333333333333333333",
      isConnected: true,
      chainId: 80002
    };
    render(<V2Shell />);
    await waitFor(() => expect(disconnectMock).toHaveBeenCalledTimes(1));
    const dismiss = screen.getByTestId("v2-stale-session-dismiss");
    await act(async () => {
      dismiss.click();
    });
    expect(screen.queryByTestId("v2-stale-session-banner")).toBeNull();
    // Effect re-runs after dismiss state update; one-shot ref must hold.
    expect(disconnectMock).toHaveBeenCalledTimes(1);
    expect(openMock).not.toHaveBeenCalled();
  });

  it("does not treat missing chainId as stale during hydrate", () => {
    accountState = {
      address: "0x4444444444444444444444444444444444444444",
      isConnected: true,
      chainId: undefined
    };
    render(<V2Shell />);
    expect(disconnectMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("v2-stale-session-banner")).toBeNull();
  });
});
