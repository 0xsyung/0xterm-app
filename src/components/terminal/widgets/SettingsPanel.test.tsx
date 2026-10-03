// @vitest-environment jsdom
/**
 * @file SettingsPanel.test.tsx
 * @description Settings group headings (#140 B4)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { THEMES } from "../constants";
import SettingsPanel from "./SettingsPanel";

const theme = THEMES.matrix;

describe("SettingsPanel groups (#140 B4)", () => {
  it("wraps sections in NETWORK, WALLET, and TERMINAL with hints", () => {
    render(
      <SettingsPanel
        theme={theme}
        currentThemeKey="matrix"
        onThemeChange={vi.fn()}
        mode="invest"
        onModeChange={vi.fn()}
        rpcProviders={{}}
        activeRpcProviders={{}}
        onRpcChange={vi.fn()}
        explorerKeys={{}}
        onExplorerKeysChange={vi.fn()}
        customTokens={{}}
        onCustomTokensChange={vi.fn()}
        channelStore={{ channels: [], activeId: null }}
        onChannelStoreChange={vi.fn()}
        pinned={[]}
        onPinnedChange={vi.fn()}
        walletAddress={null}
        isConnected={false}
        onApplyImport={vi.fn()}
      />
    );

    const network = screen.getByTestId("settings-group-network");
    const wallet = screen.getByTestId("settings-group-wallet");
    const terminal = screen.getByTestId("settings-group-terminal");

    expect(network.textContent).toMatch(/NETWORK/);
    expect(network.textContent).toContain(
      "Endpoints and explorer keys for these chains."
    );
    const hint = network.querySelectorAll("div")[1] as HTMLElement;
    expect(hint.className).toMatch(/text-\[10px\]/);
    expect(hint.className).toContain(theme.muted);
    expect(wallet.textContent).toContain(
      "Tokens and chat channels saved on this wallet."
    );
    expect(terminal.textContent).toContain("Look, start mode, and backup.");

    const panel = screen.getByTestId("settings-panel").textContent || "";
    const order = [
      "NETWORK",
      "RPC / API providers",
      "Explorer API keys",
      "WALLET",
      "Custom tokens",
      "Channels",
      "TERMINAL",
      "Theme",
      "Default mode",
      "Export / Import"
    ];
    let at = -1;
    for (const label of order) {
      const idx = panel.indexOf(label, at + 1);
      expect(idx, label).toBeGreaterThan(at);
      at = idx;
    }
  });
});
