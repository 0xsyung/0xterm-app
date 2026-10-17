/**
 * @file PlanWidget.tsx
 * @description Pin-able saved plan show — intents only (#24 Soft chrome)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React from "react";
import type { ThemeConfig } from "../types";
import type { Plan } from "../plan/types";
import { lastSimLabel, stepChainLabel, stepSummary } from "../plan/summary";
import { PLAN_WARN_BANNER } from "../plan/constants";
import PinButton from "./PinButton";

export default function PlanWidget({
  theme,
  plan,
  warnBanner = PLAN_WARN_BANNER,
  onPin,
  pinned
}: {
  theme: ThemeConfig;
  plan?: Plan | null;
  warnBanner?: string;
  onPin?: () => void;
  pinned?: boolean;
}) {
  if (!plan) {
    return (
      <div className={`my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.warn} text-xs`}>
        Plan unavailable.
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
        <span className={`font-bold ${theme.primary} tracking-wider`}>
          PLAN {plan.name}
        </span>
        <div className="flex items-center gap-2">
          <span className={`${theme.muted} tabular-nums`}>
            {plan.steps.length} step{plan.steps.length === 1 ? "" : "s"}
          </span>
          {!pinned && <PinButton onPin={onPin} theme={theme} />}
        </div>
      </div>

      <div className={`p-2 border ${theme.border} ${theme.warn} ${theme.rounded}`}>
        {warnBanner}
      </div>

      {plan.steps.length === 0 ? (
        <div className={theme.muted}>Empty plan. `plan add swap …` or record payable cmds.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`${theme.muted} text-[10px] tracking-wider`}>
                <th className="pr-2 py-1 font-bold">#</th>
                <th className="pr-2 py-1 font-bold">KIND</th>
                <th className="pr-2 py-1 font-bold">SUMMARY</th>
                <th className="pr-2 py-1 font-bold">CHAIN</th>
                <th className="pr-2 py-1 font-bold">SIM</th>
                <th className="py-1 font-bold">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {plan.steps.map((step, i) => {
                const sim = lastSimLabel(step);
                const simClass =
                  sim === "ok"
                    ? theme.primary
                    : sim === "drift" || sim === "error"
                      ? theme.warn
                      : theme.muted;
                return (
                  <tr key={step.id} className={`border-t ${theme.border}`}>
                    <td className="pr-2 py-1.5 tabular-nums align-top">{i + 1}</td>
                    <td className={`pr-2 py-1.5 font-bold ${theme.primary} align-top`}>
                      {step.kind}
                    </td>
                    <td className="pr-2 py-1.5 align-top break-words">
                      {stepSummary(step)}
                    </td>
                    <td className="pr-2 py-1.5 tabular-nums align-top">
                      {stepChainLabel(step)}
                    </td>
                    <td className={`pr-2 py-1.5 align-top ${simClass}`}>{sim}</td>
                    <td className="py-1.5 align-top">{step.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={`text-[10px] ${theme.muted} pt-1 border-t ${theme.border}`}>
        updated{" "}
        <span className="tabular-nums">
          {new Date(plan.updatedAt).toLocaleString(undefined, {
            hour12: false
          })}
        </span>
        {" · "}intents in prefs JSON — no signatures stored
      </div>
    </div>
  );
}
