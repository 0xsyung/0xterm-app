/**
 * @file SettingsScreen.tsx
 * @description V2 Settings — mainnets, disconnect, news retention (#295)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "@/components/terminal/types";
import { btnClass } from "@/components/terminal/ui/buttonClasses";
import {
  V2_MAINNET_CHAINS,
  v2ChainShortName
} from "../networks";
import {
  getNewsMeta,
  setNewsRetention,
  type NewsRetention
} from "../news/store";
import { useV2 } from "../V2Context";

function truncateAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function SettingsScreen({
  theme,
  isConnected,
  address,
  activeChainId,
  onDisconnect,
  onSelectChain,
  onClose
}: {
  theme: ThemeConfig;
  isConnected: boolean;
  address: string | null;
  activeChainId: number | null;
  onDisconnect: () => void;
  onSelectChain: (chainId: number) => void;
  onClose: () => void;
}) {
  const { setLastChainId } = useV2();
  const [retention, setRetention] = useState<NewsRetention>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meta = await getNewsMeta();
        if (!cancelled) setRetention(meta.retention);
      } catch {
        /* idb */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      data-testid="v2-settings"
      className={`flex flex-col gap-4 p-4 ${theme.text}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className={`text-lg font-bold ${theme.primary}`}>Settings</h1>
        <button
          type="button"
          data-testid="v2-settings-close"
          className={btnClass({ theme, variant: "ghost", size: "md" })}
          onClick={onClose}
        >
          Done
        </button>
      </div>

      <div className={`border ${theme.border} ${theme.cardBg} ${theme.rounded} p-3`}>
        <div className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>
          Wallet
        </div>
        {isConnected && address ? (
          <>
            <div
              className="font-mono text-sm mt-1"
              data-testid="v2-settings-address"
            >
              {truncateAddress(address)}
            </div>
            <button
              type="button"
              data-testid="v2-settings-disconnect"
              className={btnClass({
                theme,
                variant: "warn",
                size: "lg",
                block: true,
                className: "mt-3"
              })}
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          </>
        ) : (
          <p className={`text-sm mt-1 ${theme.muted}`}>Not connected</p>
        )}
      </div>

      <div className={`border ${theme.border} ${theme.cardBg} ${theme.rounded} p-3`}>
        <div className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>
          Networks
        </div>
        <p className={`text-[11px] mt-1 mb-2 ${theme.muted}`}>
          Mainnets only. Ethereum · Arbitrum · Base · Polygon · Optimism ·
          HyperEVM.
        </p>
        <ul className="flex flex-col gap-1" data-testid="v2-settings-networks">
          {V2_MAINNET_CHAINS.map((c) => {
            const active = activeChainId === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  data-testid={`v2-settings-net-${c.id}`}
                  aria-pressed={active}
                  className={`w-full text-left min-h-[44px] px-3 py-2 border ${theme.rounded} ${
                    active
                      ? "border-transparent font-bold"
                      : `${theme.border} ${theme.muted}`
                  }`}
                  style={
                    active
                      ? { background: theme.phosphor, color: "#000" }
                      : undefined
                  }
                  onClick={() => {
                    onSelectChain(c.id);
                    setLastChainId(c.id);
                  }}
                >
                  {v2ChainShortName(c.id)} — {c.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={`border ${theme.border} ${theme.cardBg} ${theme.rounded} p-3`}>
        <div className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>
          News retention
        </div>
        <p className={`text-[11px] mt-1 mb-2 ${theme.muted}`}>
          Local archive default is All. Search runs against the device store.
        </p>
        <div className="flex flex-wrap gap-2" data-testid="v2-settings-retention">
          {(["90d", "1y", "all"] as NewsRetention[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={retention === r}
              className={btnClass({
                theme,
                variant: retention === r ? "primary" : "secondary",
                size: "md",
                className: "uppercase"
              })}
              style={
                retention === r
                  ? { background: theme.phosphor, color: "#000" }
                  : undefined
              }
              onClick={async () => {
                setRetention(r);
                try {
                  await setNewsRetention(r);
                } catch {
                  /* idb */
                }
              }}
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      <div className={`border ${theme.border} ${theme.cardBg} ${theme.rounded} p-3`}>
        <div className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>
          Theme
        </div>
        <p className={`text-sm mt-1 ${theme.primary}`} data-testid="v2-settings-theme">
          Finance
        </p>
        <p className={`text-[11px] ${theme.muted}`}>
          One professional finance theme. Theme switching is not available.
        </p>
      </div>
    </section>
  );
}
