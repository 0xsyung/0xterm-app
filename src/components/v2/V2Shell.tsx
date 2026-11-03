/**
 * @file V2Shell.tsx
 * @description V2 portfolio manager shell (#295) — Holdings/PnL/Move/News/Reports
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { getV2Theme } from "./theme";
import { V2Provider, useV2 } from "./V2Context";
import V2Header from "./V2Header";
import HoldingsScreen, { type V2HoldingRow } from "./screens/HoldingsScreen";
import PnlScreen, {
  type V2CostBasisRow,
  type V2PnlHistoryRow,
  type V2PnlSummary
} from "./screens/PnlScreen";
import MoveScreen from "./screens/MoveScreen";
import NewsScreen from "./screens/NewsScreen";
import ReportsScreen from "./screens/ReportsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { isV2Mainnet, v2ChainShortName } from "./networks";

function V2ShellInner() {
  const theme = getV2Theme();
  const {
    nav,
    setNav,
    settingsOpen,
    setSettingsOpen,
    lastChainId,
    setLastChainId
  } = useV2();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { open } = useAppKit();

  const activeChainId =
    chainId && isV2Mainnet(chainId) ? chainId : lastChainId;

  useEffect(() => {
    if (chainId && isV2Mainnet(chainId)) setLastChainId(chainId);
  }, [chainId, setLastChainId]);

  const onWalletOpen = useCallback(() => {
    void open();
  }, [open]);

  const onSelectChain = useCallback(
    (id: number) => {
      setLastChainId(id);
      try {
        switchChain?.({ chainId: id });
      } catch {
        /* wallet may reject */
      }
    },
    [setLastChainId, switchChain]
  );

  // Day-one: no invented balances when disconnected; connected starts empty
  // until live portfolio wiring fills rows (honest empty > fake data).
  const [holdings] = useState<V2HoldingRow[]>([]);
  const summary: V2PnlSummary = useMemo(
    () => ({ unrealizedUsd: null, realizedUsd: null, totalUsd: null }),
    []
  );
  const [costBasis] = useState<V2CostBasisRow[]>([]);
  const [history] = useState<V2PnlHistoryRow[]>([]);

  const gridBg = theme.hasGrid
    ? {
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: "24px 24px"
      }
    : undefined;

  return (
    <div
      data-testid="v2-shell"
      className={`w-full h-full min-h-0 flex flex-col overflow-hidden ${theme.bg} ${theme.text} ${theme.font}`}
      style={gridBg}
    >
      <V2Header
        theme={theme}
        nav={nav}
        onNavChange={setNav}
        settingsOpen={settingsOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        activeChainId={activeChainId}
        walletAddress={address ?? null}
        isWalletConnected={!!isConnected}
        onWalletOpen={onWalletOpen}
      />
      <main
        className="flex-1 min-h-0 overflow-y-auto"
        data-testid="v2-main"
      >
        {settingsOpen ? (
          <SettingsScreen
            theme={theme}
            isConnected={!!isConnected}
            address={address ?? null}
            activeChainId={activeChainId}
            onDisconnect={() => disconnect()}
            onSelectChain={onSelectChain}
            onClose={() => setSettingsOpen(false)}
          />
        ) : nav === "holdings" ? (
          <HoldingsScreen
            theme={theme}
            isConnected={!!isConnected}
            holdings={holdings}
            onConnect={onWalletOpen}
          />
        ) : nav === "pnl" ? (
          <PnlScreen
            theme={theme}
            isConnected={!!isConnected}
            summary={summary}
            costBasis={costBasis}
            history={history}
            onConnect={onWalletOpen}
          />
        ) : nav === "move" ? (
          <MoveScreen
            theme={theme}
            isConnected={!!isConnected}
            onConnect={onWalletOpen}
          />
        ) : nav === "news" ? (
          <NewsScreen theme={theme} />
        ) : (
          <ReportsScreen theme={theme} />
        )}
      </main>
      {/* Prefetch short name helper usage for tree-shake safety in tests */}
      <span className="sr-only" aria-hidden>
        {activeChainId != null ? v2ChainShortName(activeChainId) : ""}
      </span>
    </div>
  );
}

export default function V2Shell() {
  return (
    <V2Provider>
      <V2ShellInner />
    </V2Provider>
  );
}
