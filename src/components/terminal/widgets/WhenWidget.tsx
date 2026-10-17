/**
 * @file WhenWidget.tsx
 * @description Pin-able when watcher card — Soft chrome locks (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React from "react";
import type { ThemeConfig } from "../types";
import type { WhenRule, WhenRuntimeState } from "../when/types";
import {
  WHEN_DEFAULT_COOLDOWN_SEC,
  WHEN_DEFAULT_POLL_SEC,
  WHEN_WARN_BANNER
} from "../when/constants";
import { actionLabel, formatTick, formatTickAt, triggerLabel } from "../when/summary";
import { runtimeStateFor } from "../when/engine";
import PinButton from "./PinButton";

export default function WhenWidget({
  theme,
  rules,
  warnBanner = WHEN_WARN_BANNER,
  tabHidden = false,
  justFiredId = null,
  pollSec = WHEN_DEFAULT_POLL_SEC,
  onPin,
  pinned
}: {
  theme: ThemeConfig;
  rules?: WhenRule[] | null;
  warnBanner?: string;
  /** Soft: dormant-tab visually distinct from paused. */
  tabHidden?: boolean;
  justFiredId?: string | null;
  pollSec?: number;
  onPin?: () => void;
  pinned?: boolean;
}) {
  const list = rules ?? [];
  if (list.length === 0) {
    return (
      <div
        className={`my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.warn} text-xs`}
      >
        No watchers. Watching only while this tab is open.
      </div>
    );
  }

  return (
    <div
      className={`relative group text-xs space-y-2 my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow || ""} w-full ${theme.text}`}
    >
      <div
        className={`flex justify-between items-center border-b ${theme.border} pb-1`}
      >
        <span className={`font-bold ${theme.primary} tracking-wider`}>WHEN</span>
        <div className="flex items-center gap-2">
          <span className={`${theme.muted} tabular-nums`}>
            poll {pollSec}s · cd {list[0]?.cooldownSec ?? WHEN_DEFAULT_COOLDOWN_SEC}s
          </span>
          {!pinned && <PinButton onPin={onPin} theme={theme} />}
        </div>
      </div>

      <div className={`p-2 border ${theme.border} ${theme.warn} ${theme.rounded}`}>
        {warnBanner}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`${theme.muted} text-[10px] tracking-wider`}>
              <th className="pr-2 py-1 font-bold">ID</th>
              <th className="pr-2 py-1 font-bold">TRIGGER</th>
              <th className="pr-2 py-1 font-bold">ACTION</th>
              <th className="pr-2 py-1 font-bold">STATE</th>
              <th className="pr-2 py-1 font-bold">TICK</th>
              <th className="py-1 font-bold">PRICE</th>
            </tr>
          </thead>
          <tbody>
            {list.map((rule) => {
              const state: WhenRuntimeState = runtimeStateFor(rule, {
                tabHidden,
                justFiredId
              });
              const stateClass =
                state === "fired"
                  ? theme.warn
                  : state === "dormant-tab"
                    ? `${theme.muted} italic`
                    : state === "paused"
                      ? theme.muted
                      : theme.primary;
              const rowPulse = state === "fired" ? theme.warn : "";
              return (
                <tr
                  key={rule.id}
                  className={`border-t ${theme.border} ${rowPulse}`}
                  data-state={state}
                >
                  <td className={`pr-2 py-1.5 font-mono align-top ${theme.primary}`}>
                    {rule.id}
                  </td>
                  <td className="pr-2 py-1.5 align-top break-words">
                    {triggerLabel(rule)}
                  </td>
                  <td className="pr-2 py-1.5 align-top">
                    {actionLabel(rule.action)}
                  </td>
                  <td className={`pr-2 py-1.5 align-top font-bold ${stateClass}`}>
                    {state}
                  </td>
                  <td className={`pr-2 py-1.5 align-top tabular-nums ${theme.muted}`}>
                    {formatTickAt(rule)}
                  </td>
                  <td className="py-1.5 align-top tabular-nums">
                    {formatTick(rule)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={`text-[10px] ${theme.muted} pt-1 border-t ${theme.border}`}>
        {tabHidden ? (
          <span className={theme.warn}>
            dormant-tab — polls paused while hidden. Resume on visible.
          </span>
        ) : (
          <span>
            definitions in prefs JSON — timers live only in this open tab
          </span>
        )}
      </div>
    </div>
  );
}
