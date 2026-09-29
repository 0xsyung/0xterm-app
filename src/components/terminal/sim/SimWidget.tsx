/**
 * @file SimWidget.tsx
 * @description sim result card — eth_call outcome, gas, account notice (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useState } from "react";
import type { Address, Chain } from "viem";
import type { ThemeConfig } from "../types";
import { truncateAddress } from "../dig/encode";
import { SIM_ZERO_ACCOUNT, type SimOutcome } from "./simulate";

export default function SimWidget({
  to,
  data,
  value,
  account,
  accountIsZero,
  chain,
  sim,
  onResim,
  theme
}: {
  to: Address;
  data: `0x${string}`;
  value?: `0x${string}`;
  account?: Address;
  accountIsZero?: boolean;
  chain: Chain;
  sim?: SimOutcome;
  onResim?: () => void;
  theme: ThemeConfig;
}) {
  const [expanded, setExpanded] = useState(false);
  const short = data.length > 34 ? `${data.slice(0, 20)}…${data.slice(-10)}` : data;

  return (
    <div
      className={`my-2 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} w-full text-[10px] space-y-1.5 tabular-nums`}
      data-testid="sim-widget"
    >
      <div className="flex items-center justify-between">
        <span className={`uppercase text-[10px] font-bold ${theme.primary}`}>
          SIM
        </span>
        <span className={theme.muted}>{chain.name}</span>
      </div>

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>TO</span>
        <span className="font-mono break-all">{truncateAddress(to)}</span>
      </div>

      <div className="flex justify-between items-start gap-2">
        <span className={theme.muted}>DATA</span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`font-mono break-all text-left ml-2 cursor-pointer ${expanded ? "" : theme.muted}`}
          aria-label={expanded ? "Collapse data" : "Expand data"}
        >
          {expanded ? data : short}
        </button>
      </div>

      {value !== undefined && value !== "0x0" && (
        <div className="flex justify-between gap-2">
          <span className={theme.muted}>VALUE</span>
          <span className="font-mono">{value}</span>
        </div>
      )}

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>ACCOUNT</span>
        <span className={`font-mono ${accountIsZero ? theme.warn : ""}`}>
          {account ? truncateAddress(account) : SIM_ZERO_ACCOUNT.slice(0, 12)}
          {accountIsZero ? " (zero)" : ""}
        </span>
      </div>

      {sim?.ok ? (
        <div className={`${theme.primary}`} data-testid="sim-ok">
          [✓] eth_call OK{sim.gas > 0n ? ` — gas ~${sim.gas}` : ""}
        </div>
      ) : sim ? (
        <div className={`${theme.warn}`} data-testid="sim-error">
          {sim.ok === false && (sim.code === "sim.rpc" ? "[!] eth_call failed" : "[!] revert")} —{" "}
          {sim.ok === false ? sim.reason : ""}
        </div>
      ) : null}

      {onResim && (
        <div className="flex gap-1 pt-1">
          <button
            type="button"
            onClick={onResim}
            className={`uppercase text-[10px] px-2 border ${theme.border} ${theme.primary} cursor-pointer`}
          >
            RESIM
          </button>
        </div>
      )}
    </div>
  );
}
