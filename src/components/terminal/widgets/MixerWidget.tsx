/**
 * @file MixerWidget.tsx
 * @description mixer pools / notes / status — pinnable Soft ACK #111
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React from "react";
import type { ThemeConfig } from "../types";
import PinButton from "./PinButton";
import {
  MIXER_LEGAL_FOOTER,
  MIXER_POOLS_FOOTER,
  truncateHex
} from "../mixer/constants";
import type { PoolRow } from "../mixer/poolReads";

export type MixerWidgetMode = "pools" | "notes" | "status";

export type MixerNoteRow = {
  id: string;
  commitment: `0x${string}`;
  poolId: string;
  chainId: number;
  denomination: string;
  token: string;
  createdAt: number;
  spent: boolean;
};

export type MixerStatusPayload = {
  status: string;
  poolId: string;
  denomination: string;
  token: string;
  commitment: `0x${string}`;
  chainLabel: string;
};

type Props = {
  mode: MixerWidgetMode;
  theme: ThemeConfig;
  chainLabel: string;
  poolRows?: PoolRow[];
  notes?: MixerNoteRow[];
  statusPayload?: MixerStatusPayload;
  onPin?: () => void;
  pinned?: boolean;
};

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

export default function MixerWidget({
  mode,
  theme,
  chainLabel,
  poolRows,
  notes,
  statusPayload,
  onPin,
  pinned
}: Props) {
  const header =
    mode === "pools"
      ? "MIXER POOLS"
      : mode === "notes"
        ? "MIXER NOTES"
        : "MIXER STATUS";

  return (
    <div
      className={`relative group my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} text-xs w-full overflow-x-auto`}
    >
      {!pinned && (
        <PinButton
          onPin={onPin}
          theme={theme}
          className="absolute -top-1 -right-1 z-10 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
        />
      )}
      <div
        className={`flex justify-between items-center ${theme.text}/70 border-b ${theme.border} pb-1`}
      >
        <span className="font-bold">{header}</span>
        <span className={`uppercase ${theme.muted}`}>{chainLabel}</span>
      </div>

      {mode === "pools" && (
        <>
          {!poolRows || poolRows.length === 0 ? (
            <div className={`pt-2 ${theme.muted}`}>
              No mixer pools on {chainLabel}.
            </div>
          ) : (
            <table className={`w-full text-left ${theme.text} mt-2`}>
              <thead>
                <tr className={`text-[10px] ${theme.text}/50 border-b ${theme.border}`}>
                  <th className="py-1 pr-2">DENOM</th>
                  <th className="py-1 pr-2">TOKEN</th>
                  <th className="py-1 pr-2">POOL</th>
                  <th className="py-1 pr-2 text-right">BALANCE</th>
                  <th className="py-1 pr-2 text-right">SET</th>
                </tr>
              </thead>
              <tbody>
                {poolRows.map((r) => (
                  <tr key={r.pool.id}>
                    <td className={`py-1 pr-2 tabular-nums ${theme.primary}`}>
                      {r.pool.denomination}
                    </td>
                    <td className="py-1 pr-2">{r.pool.token}</td>
                    <td className={`py-1 pr-2 font-mono ${theme.muted}`}>
                      {truncateHex(r.pool.address)}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {r.balanceHuman}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {r.setSize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className={`pt-2 ${theme.muted}`}>{MIXER_POOLS_FOOTER}</div>
          <div className={`pt-1 ${theme.muted}`}>{MIXER_LEGAL_FOOTER}</div>
        </>
      )}

      {mode === "notes" && (
        <>
          {!notes || notes.length === 0 ? (
            <div className={`pt-2 ${theme.muted}`}>No local notes.</div>
          ) : (
            <table className={`w-full text-left ${theme.text} mt-2`}>
              <thead>
                <tr className={`text-[10px] ${theme.text}/50 border-b ${theme.border}`}>
                  <th className="py-1 pr-2">ID</th>
                  <th className="py-1 pr-2">POOL</th>
                  <th className="py-1 pr-2">CHAIN</th>
                  <th className="py-1 pr-2">STATUS</th>
                  <th className="py-1 pr-2">TIME</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((n) => (
                  <tr key={n.id + n.commitment}>
                    <td className={`py-1 pr-2 font-mono ${theme.primary}`}>
                      {n.id}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">
                      {n.denomination} {n.token}
                    </td>
                    <td className={`py-1 pr-2 ${theme.muted}`}>{n.chainId}</td>
                    <td
                      className={`py-1 pr-2 ${n.spent ? theme.muted : theme.primary}`}
                    >
                      {n.spent ? "spent" : "unspent"}
                    </td>
                    <td className={`py-1 pr-2 tabular-nums ${theme.muted}`}>
                      {fmtTime(n.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className={`pt-2 ${theme.muted}`}>
            Secrets never shown · encrypted at rest
          </div>
        </>
      )}

      {mode === "status" && statusPayload && (
        <div className={`pt-2 space-y-1 ${theme.text}`}>
          <div>
            <span className={theme.muted}>STATUS </span>
            <span
              className={
                statusPayload.status === "unspent"
                  ? theme.primary
                  : theme.muted
              }
            >
              {statusPayload.status}
            </span>
          </div>
          <div>
            <span className={theme.muted}>POOL </span>
            <span className="tabular-nums">
              {statusPayload.denomination} {statusPayload.token} (
              {statusPayload.poolId})
            </span>
          </div>
          <div>
            <span className={theme.muted}>COMMITMENT </span>
            <span className="font-mono">
              {truncateHex(statusPayload.commitment)}
            </span>
          </div>
          <div className={theme.muted}>nullifier not shown</div>
        </div>
      )}
    </div>
  );
}
