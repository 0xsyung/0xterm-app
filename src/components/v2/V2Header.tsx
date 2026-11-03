/**
 * @file V2Header.tsx
 * @description V2 mobile-first header — primary nav + network + Connect (#295 I)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "@/components/terminal/types";
import { BTN_TOUCH, btnClass } from "@/components/terminal/ui/buttonClasses";
import { formatLocalHms } from "@/components/terminal/localTime";
import {
  V2_NAV_LABEL,
  V2_PRIMARY_NAV,
  type V2PrimaryNav
} from "./nav";
import { v2ChainShortName } from "./networks";

const FILL_FG = "#000000";

function truncateAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function V2Header({
  theme,
  nav,
  onNavChange,
  settingsOpen,
  onOpenSettings,
  activeChainId,
  walletAddress,
  isWalletConnected,
  onWalletOpen
}: {
  theme: ThemeConfig;
  nav: V2PrimaryNav;
  onNavChange: (n: V2PrimaryNav) => void;
  settingsOpen: boolean;
  onOpenSettings: () => void;
  activeChainId: number | null;
  walletAddress: string | null;
  isWalletConnected: boolean;
  onWalletOpen: () => void;
}) {
  const [clock, setClock] = useState(() => formatLocalHms(new Date()));
  useEffect(() => {
    const id = setInterval(() => setClock(formatLocalHms(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const connected = !!(isWalletConnected && walletAddress);
  const netLabel =
    activeChainId != null ? v2ChainShortName(activeChainId) : "NETWORK";

  return (
    <header
      data-testid="v2-header"
      className={`shrink-0 z-30 flex flex-col gap-2 px-[calc(0.75rem_+_env(safe-area-inset-left))] pr-[calc(0.75rem_+_env(safe-area-inset-right))] pt-[calc(0.5rem_+_env(safe-area-inset-top))] pb-2 ${theme.primary}`}
      style={{ borderBottom: `2px solid ${theme.phosphor}` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex items-center gap-2 shrink-0"
          data-testid="v2-brand"
        >
          <img
            src="/logo.svg"
            alt="0xTERM"
            width={28}
            height={28}
            className="w-7 h-7 shrink-0"
            draggable={false}
          />
          <span
            className={`font-bold text-[11px] tracking-widest hidden sm:inline ${theme.primary}`}
          >
            0xTERM
          </span>
        </div>
        <span className={`tabular-nums text-[10px] shrink-0 ${theme.muted}`}>
          {clock}
        </span>
        <div
          className="flex items-center gap-1.5 ml-auto shrink-0 min-w-0"
          data-testid="v2-wallet-cluster"
        >
          <button
            type="button"
            data-testid="v2-settings"
            aria-pressed={settingsOpen}
            onClick={onOpenSettings}
            className={btnClass({
              theme,
              variant: settingsOpen ? "primary" : "secondary",
              size: "md",
              className: "uppercase tracking-widest px-3"
            })}
            style={
              settingsOpen
                ? { background: theme.phosphor, color: FILL_FG }
                : undefined
            }
          >
            Settings
          </button>
          <span
            data-testid="v2-network-chip"
            className={`inline-flex items-center h-9 min-h-[44px] px-2.5 text-[10px] uppercase tracking-widest border ${theme.border} ${theme.muted} ${theme.rounded}`}
          >
            {netLabel}
          </span>
          <button
            type="button"
            data-testid={connected ? "v2-account" : "v2-connect"}
            aria-label={connected ? "Account" : "Connect wallet"}
            onClick={onWalletOpen}
            className={btnClass({
              theme,
              variant: "secondary",
              size: "md",
              className: `font-mono tabular-nums px-3 ${theme.primary}`
            })}
          >
            {connected ? truncateAddress(walletAddress!) : "Connect"}
          </button>
        </div>
      </div>

      {/*
        Mobile-first (#295 I): wrap + horizontal scroll so every primary label
        (incl. Reports) stays fully readable/reachable at ~390px. shrink-0 keeps
        chip borders intact; end spacer lets the last chip scroll fully into view.
      */}
      <nav
        role="tablist"
        aria-label="Primary"
        data-testid="v2-nav-strip"
        className="flex flex-wrap items-center gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
      >
        {V2_PRIMARY_NAV.map((id) => {
          const active = !settingsOpen && nav === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`v2-nav-${id}`}
              onClick={() => onNavChange(id)}
              className={`btn-base btn-hug btn-md relative inline-flex items-center justify-center shrink-0 min-h-[44px] h-11 px-3 sm:px-4 cursor-pointer ${BTN_TOUCH} text-[10px] uppercase tracking-widest whitespace-nowrap ${theme.rounded} ${
                active
                  ? "btn-primary border border-transparent font-bold"
                  : `btn-secondary border ${theme.border} ${theme.muted} bg-transparent`
              }`}
              style={
                active
                  ? { background: theme.phosphor, color: FILL_FG }
                  : undefined
              }
            >
              {V2_NAV_LABEL[id]}
            </button>
          );
        })}
        {/* Scroll end pad — last chip (Reports) can fully enter the viewport. */}
        <span
          aria-hidden
          className="hidden max-md:block shrink-0 w-3 h-11"
          data-testid="v2-nav-scroll-pad"
        />
      </nav>
    </header>
  );
}
