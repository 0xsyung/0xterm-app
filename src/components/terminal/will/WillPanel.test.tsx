// @vitest-environment jsdom
/**
 * @file WillPanel.test.tsx
 * @description INVEST WILL panel shell (#247 Soft ACK)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import WillPanel, {
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
});
