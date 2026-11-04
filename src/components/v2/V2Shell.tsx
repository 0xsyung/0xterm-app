/**
 * @file V2Shell.tsx
 * @description V2 portfolio manager shell (#295) — Holdings/PnL/Move/News/Reports
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
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
import { isV2Mainnet } from "./networks";
import {
  STALE_SESSION_BANNER,
  shouldClearStaleSession
} from "./staleSession";

function V2ShellInner() {
  const theme = getV2Theme();
  const { nav, setNav, setLastChainId } = useV2();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { open, close } = useAppKit();

  useEffect(() => {
    if (chainId && isV2Mainnet(chainId)) setLastChainId(chainId);
  }, [chainId, setLastChainId]);

  const onWalletOpen = useCallback(() => {
    void open();
  }, [open]);

  const onDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // #310: one-shot clear of restored sessions on non-V2 chains so AppKit
  // cannot reopen UnsupportedChain after a failed mobile switchChain.
  const [staleBanner, setStaleBanner] = useState<string | null>(null);
  const clearingStaleRef = useRef(false);
  useEffect(() => {
    if (
      !shouldClearStaleSession({
        isConnected: !!isConnected,
        chainId
      })
    ) {
      clearingStaleRef.current = false;
      return;
    }
    if (clearingStaleRef.current) return;
    clearingStaleRef.current = true;
    disconnect();
    void close();
    setStaleBanner(STALE_SESSION_BANNER);
  }, [isConnected, chainId, disconnect, close]);

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
        walletAddress={address ?? null}
        isWalletConnected={!!isConnected}
        onWalletOpen={onWalletOpen}
        onDisconnect={onDisconnect}
      />
      {staleBanner ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="v2-stale-session-banner"
          className={`shrink-0 flex items-start gap-2 px-[calc(0.75rem_+_env(safe-area-inset-left))] pr-[calc(0.75rem_+_env(safe-area-inset-right))] py-2 text-[11px] leading-snug border-b ${theme.border} ${theme.warn}`}
        >
          <span className="flex-1 min-w-0">{staleBanner}</span>
          <button
            type="button"
            data-testid="v2-stale-session-dismiss"
            className={`shrink-0 min-h-[44px] px-3 uppercase tracking-widest text-[10px] border ${theme.border} ${theme.rounded}`}
            onClick={() => setStaleBanner(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <main
        className="flex-1 min-h-0 overflow-y-auto"
        data-testid="v2-main"
      >
        {nav === "holdings" ? (
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
