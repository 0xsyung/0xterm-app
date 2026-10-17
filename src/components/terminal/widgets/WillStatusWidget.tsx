/**
 * @file WillStatusWidget.tsx
 * @description will / will status — vault status + legal banner (#26 Soft ACK)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useEffect, useState } from "react";
import { getAddress, type Address } from "viem";
import type { ThemeConfig } from "../types";
import PinButton from "./PinButton";
import { WILL_LEGAL_BANNER, WILL_USAGE, truncateAddr } from "../will/constants";
import {
  formatAge,
  formatCountdown,
  formatDelayHuman
} from "../will/delay";

export type WillBalanceRow = {
  token: Address | "ETH";
  symbol: string;
  amount: string;
};

export type WillStatusPayload = {
  chainName: string;
  chainId: number;
  vault: Address | null;
  owner: Address | null;
  heir: Address | null;
  delaySec: number | null;
  lastHeartbeat: number | null;
  claimableAt: number | null;
  isClaimable: boolean;
  cancelled: boolean;
  claimed: boolean;
  balances: WillBalanceRow[];
  usageHint?: boolean;
};

function CopyableAddr({
  addr,
  theme
}: {
  addr: string;
  theme: ThemeConfig;
}) {
  const [copied, setCopied] = useState(false);
  let display = addr;
  try {
    display = getAddress(addr as Address);
  } catch {
    /* keep raw */
  }
  return (
    <button
      type="button"
      title={display}
      className={`font-mono normal-case underline-offset-2 hover:underline ${theme.primary}`}
      onClick={() => {
        try {
          void navigator.clipboard?.writeText(display);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? "copied" : truncateAddr(display)}
    </button>
  );
}

function fmtAbs(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  try {
    return new Date(sec * 1000).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  } catch {
    return "—";
  }
}

export default function WillStatusWidget({
  theme,
  payload,
  nowSec: nowProp,
  onPin,
  pinned
}: {
  theme: ThemeConfig;
  payload: WillStatusPayload;
  nowSec?: number;
  onPin?: () => void;
  pinned?: boolean;
}) {
  const [now, setNow] = useState(
    () => nowProp ?? Math.floor(Date.now() / 1000)
  );
  useEffect(() => {
    if (nowProp != null) {
      setNow(nowProp);
      return;
    }
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, [nowProp]);

  const hasVault = !!payload.vault;
  const claimableNow =
    hasVault &&
    !payload.cancelled &&
    !payload.claimed &&
    (payload.isClaimable ||
      (payload.claimableAt != null && now >= payload.claimableAt));
  const countdown =
    payload.claimableAt != null
      ? formatCountdown(payload.claimableAt - now)
      : "—";
  const age =
    payload.lastHeartbeat != null
      ? formatAge(now - payload.lastHeartbeat)
      : "—";

  return (
    <div
      className={`relative group my-3 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} w-full max-w-xl ${theme.text} text-xs space-y-2`}
    >
      <div
        className={`flex justify-between items-start border-b ${theme.border} pb-1 text-[10px] tracking-wider`}
      >
        <span className={`font-bold ${theme.primary}`}>WILL STATUS</span>
        <div className="flex items-center gap-2">
          <span className={`${theme.muted} tabular-nums`}>
            {payload.chainName} · {payload.chainId}
          </span>
          {!pinned && <PinButton onPin={onPin} theme={theme} />}
        </div>
      </div>

      <div className="space-y-1 text-[10px] tabular-nums">
        <div>
          <span className={theme.muted}>VAULT </span>
          {hasVault && payload.vault ? (
            <CopyableAddr addr={payload.vault} theme={theme} />
          ) : (
            <span className={theme.warn}>NO VAULT</span>
          )}
        </div>
        {hasVault && (
          <>
            <div>
              <span className={theme.muted}>OWNER </span>
              {payload.owner ? (
                <CopyableAddr addr={payload.owner} theme={theme} />
              ) : (
                "—"
              )}
            </div>
            <div>
              <span className={theme.muted}>HEIR </span>
              {payload.heir ? (
                <CopyableAddr addr={payload.heir} theme={theme} />
              ) : (
                "—"
              )}
            </div>
            <div>
              <span className={theme.muted}>DELAY </span>
              <span className={theme.primary}>
                {payload.delaySec != null
                  ? formatDelayHuman(payload.delaySec)
                  : "—"}
              </span>
              {payload.delaySec != null && (
                <span className={`${theme.muted} ml-2`}>
                  ({payload.delaySec}s)
                </span>
              )}
            </div>
            <div>
              <span className={theme.muted}>LAST HEARTBEAT </span>
              <span>{fmtAbs(payload.lastHeartbeat)}</span>
              <span className={`${theme.muted} ml-2`}>{age}</span>
            </div>
            <div>
              <span className={theme.muted}>CLAIMABLE AT </span>
              {claimableNow ? (
                <span className={theme.warn}>CLAIMABLE NOW</span>
              ) : (
                <>
                  <span>{fmtAbs(payload.claimableAt)}</span>
                  <span className={`${theme.muted} ml-2`}>{countdown}</span>
                </>
              )}
            </div>
            {(payload.cancelled || payload.claimed) && (
              <div className={theme.warn}>
                {payload.claimed
                  ? "CLAIMED — vault latched"
                  : "CANCELLED — claim disabled"}
              </div>
            )}
            <div className={`pt-1 border-t ${theme.border}`}>
              <div className={`${theme.muted} mb-0.5`}>BALANCES</div>
              {payload.balances.length === 0 ? (
                <div className={theme.muted}>0 (nothing deposited)</div>
              ) : (
                payload.balances.map((b) => (
                  <div key={String(b.token)} className="flex gap-2">
                    <span className={theme.primary}>{b.symbol}</span>
                    <span>{b.amount}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
        {!hasVault && (
          <div className={`${theme.muted} whitespace-pre-wrap font-mono`}>
            {payload.usageHint !== false ? WILL_USAGE : null}
          </div>
        )}
      </div>

      <div
        className={`mt-2 p-2 border text-[9px] leading-snug ${theme.warn} ${theme.rounded}`}
      >
        {WILL_LEGAL_BANNER}
      </div>
    </div>
  );
}
