// @vitest-environment jsdom
/**
 * @file WillPanel.test.tsx
 * @description INVEST WILL panel shell (#247/#249/#251 Soft ACK)
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import WillPanel, {
  WILL_STATUS_POLL_MS,
  willCancelCmd,
  willClaimCmd,
  willDepositCmd,
  willHeartbeatCmd,
  willSetCmd,
  willWithdrawCmd
} from "./WillPanel";
import type { WillStatusPayload } from "../widgets/WillStatusWidget";

const theme = THEMES.matrix;

const samplePayload: WillStatusPayload = {
  chainName: "Sepolia",
  chainId: 11155111,
  vault: null,
  owner: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  heir: null,
  delaySec: null,
  lastHeartbeat: null,
  claimableAt: null,
  isClaimable: false,
  cancelled: false,
  claimed: false,
  balances: [],
  usageHint: true
};

describe("WillPanel command helpers", () => {
  it("builds fixed verbs", () => {
    expect(willHeartbeatCmd()).toBe("will heartbeat");
    expect(willCancelCmd()).toBe("will cancel");
    expect(willClaimCmd()).toBe("will claim");
  });
  it("builds set/deposit/withdraw or null", () => {
    expect(willSetCmd("", "90d")).toBeNull();
    expect(willSetCmd("0xabc", "")).toBe("will set --heir 0xabc --delay 90d");
    expect(willSetCmd("vitalik.eth", "30d")).toBe(
      "will set --heir vitalik.eth --delay 30d"
    );
    expect(willDepositCmd("eth", "")).toBeNull();
    expect(willDepositCmd("eth", "0.1")).toBe("will deposit eth 0.1");
    expect(willWithdrawCmd("USDC", "all")).toBe("will withdraw USDC all");
  });
});

describe("WillPanel", () => {
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false
    });
  });

  it("renders chrome, fetches status, embeds legal banner", async () => {
    const onFetch = vi.fn(async () => ({ ok: true as const, data: samplePayload }));
    render(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        onCommand={vi.fn()}
      />
    );
    expect(screen.getByTestId("will-panel")).toBeTruthy();
    expect(screen.getByText("WILL")).toBeTruthy();
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId("will-panel-status").textContent).toMatch(
        /NO VAULT|WILL STATUS/
      )
    );
    expect(screen.getByTestId("will-panel-status").textContent).toMatch(
      /inactivity switch|not a court will/i
    );
  });

  it("action buttons dispatch CLI commands", async () => {
    const onCommand = vi.fn();
    const onFetch = vi.fn(async () => ({ ok: true as const, data: samplePayload }));
    render(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        onCommand={onCommand}
      />
    );
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("will-panel-heartbeat"));
    expect(onCommand).toHaveBeenCalledWith("will heartbeat");
    fireEvent.click(screen.getByTestId("will-panel-cancel"));
    expect(onCommand).toHaveBeenCalledWith("will cancel");
    fireEvent.click(screen.getByTestId("will-panel-claim"));
    expect(onCommand).toHaveBeenCalledWith("will claim");
  });

  it("SET form builds preview and runs", async () => {
    const onCommand = vi.fn();
    render(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={vi.fn(async () => ({ ok: true as const, data: samplePayload }))}
        onCommand={onCommand}
      />
    );
    await waitFor(() => screen.getByTestId("will-panel-heir"));
    fireEvent.change(screen.getByTestId("will-panel-heir"), {
      target: { value: "0xheir" }
    });
    fireEvent.change(screen.getByTestId("will-panel-delay"), {
      target: { value: "7d" }
    });
    expect(screen.getByTestId("will-panel-set-preview").textContent).toBe(
      "will set --heir 0xheir --delay 7d"
    );
    fireEvent.click(screen.getByTestId("will-panel-set"));
    expect(onCommand).toHaveBeenCalledWith("will set --heir 0xheir --delay 7d");
  });

  it("shows fetch error", async () => {
    render(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={vi.fn(async () => ({
          ok: false as const,
          error: "No will factory on this network."
        }))}
        onCommand={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(screen.getByTestId("will-panel-error").textContent).toMatch(
        /factory/i
      )
    );
  });

  it("has no × close and no REFRESH; Escape dismisses (#249/#251)", async () => {
    const onClose = vi.fn();
    const onFetch = vi.fn(async () => ({ ok: true as const, data: samplePayload }));
    render(
      <WillPanel
        theme={theme}
        onClose={onClose}
        onFetch={onFetch}
        onCommand={vi.fn()}
      />
    );
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    expect(screen.queryByTestId("will-panel-close")).toBeNull();
    expect(screen.queryByTestId("will-panel-refresh")).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("silent 10s poll skips Loading… flash; refreshKey refetches; single-flight (#249/#251)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onFetch = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { ok: true as const, data: samplePayload };
    });
    const { rerender } = render(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        onCommand={vi.fn()}
        refreshKey={0}
      />
    );
    expect(screen.queryByTestId("will-panel-refresh")).toBeNull();
    // Mount busy load — no payload yet → Loading…
    expect(screen.getByText("Loading…")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    await waitFor(() => expect(screen.queryByText("Loading…")).toBeNull());
    await waitFor(() =>
      expect(screen.getByTestId("will-panel-status")).toBeTruthy()
    );
    const afterMount = onFetch.mock.calls.length;
    expect(afterMount).toBeGreaterThanOrEqual(1);

    // Background tick — silent (no Loading…; prior status stays)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WILL_STATUS_POLL_MS);
    });
    expect(screen.queryByText("Loading…")).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(onFetch.mock.calls.length).toBeGreaterThan(afterMount);
    expect(screen.queryByText("Loading…")).toBeNull();
    expect(screen.queryByTestId("will-panel-refresh")).toBeNull();

    // refreshKey bump → another fetch (status retained; no REFRESH chrome)
    const beforeKey = onFetch.mock.calls.length;
    rerender(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        onCommand={vi.fn()}
        refreshKey={1}
      />
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(onFetch.mock.calls.length).toBe(beforeKey + 1);
    expect(screen.queryByTestId("will-panel-refresh")).toBeNull();

    // Single-flight: refreshKey bumps while in-flight do not stack fetches
    const slow = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 200));
      return { ok: true as const, data: samplePayload };
    });
    const { rerender: rr } = render(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={slow}
        onCommand={vi.fn()}
        refreshKey={10}
      />
    );
    expect(slow.mock.calls.length).toBe(1);
    rr(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={slow}
        onCommand={vi.fn()}
        refreshKey={11}
      />
    );
    rr(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={slow}
        onCommand={vi.fn()}
        refreshKey={12}
      />
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(slow.mock.calls.length).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(slow.mock.calls.length).toBe(1);

    vi.useRealTimers();
  });

  it("pauses silent poll when document.hidden (#249)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onFetch = vi.fn(async () => ({ ok: true as const, data: samplePayload }));
    render(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={onFetch}
        onCommand={vi.fn()}
      />
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await waitFor(() => expect(onFetch).toHaveBeenCalled());
    const afterMount = onFetch.mock.calls.length;

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WILL_STATUS_POLL_MS * 3);
    });
    expect(onFetch.mock.calls.length).toBe(afterMount);

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false
    });
    vi.useRealTimers();
  });

  it("stable onFetch identity does not remount-spam load (#249)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let fetches = 0;
    const { rerender } = render(
      <WillPanel
        theme={theme}
        onClose={vi.fn()}
        onFetch={async () => {
          fetches += 1;
          return { ok: true as const, data: samplePayload };
        }}
        onCommand={vi.fn()}
      />
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await waitFor(() => expect(fetches).toBe(1));
    // New inline onFetch each render — must not re-trigger busy mount load
    for (let i = 0; i < 5; i++) {
      rerender(
        <WillPanel
          theme={theme}
          onClose={vi.fn()}
          onFetch={async () => {
            fetches += 1;
            return { ok: true as const, data: samplePayload };
          }}
          onCommand={vi.fn()}
        />
      );
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(fetches).toBe(1);
    vi.useRealTimers();
  });

});
