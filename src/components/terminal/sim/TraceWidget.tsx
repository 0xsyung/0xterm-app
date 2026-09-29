/**
 * @file TraceWidget.tsx
 * @description trace result card — structLogger opcode rows (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { Chain } from "viem";
import type { ThemeConfig } from "../types";
import type { DigTraceStep } from "../dig/debug";
import { truncateAddress } from "../dig/encode";

const TRACE_ROWS = 30;

export default function TraceWidget({
  txHash,
  chain,
  steps,
  truncated,
  theme
}: {
  txHash: `0x${string}`;
  chain: Chain;
  steps: DigTraceStep[];
  truncated?: boolean;
  theme: ThemeConfig;
}) {
  const rows = steps.slice(0, TRACE_ROWS);

  return (
    <div
      className={`my-2 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} w-full text-[10px] space-y-1.5 tabular-nums`}
      data-testid="trace-widget"
    >
      <div className="flex items-center justify-between">
        <span className={`uppercase text-[10px] font-bold ${theme.primary}`}>
          TRACE
        </span>
        <span className={theme.muted}>{chain.name}</span>
      </div>

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>TX</span>
        <span className="font-mono break-all">{truncateAddress(txHash)}</span>
      </div>

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>STEPS</span>
        <span className={`${theme.primary}`}>{steps.length.toLocaleString()}</span>
      </div>

      {truncated && (
        <div className={`${theme.warn}`} data-testid="trace-truncated">
          trace truncated — first {rows.length.toLocaleString()} of{" "}
          {steps.length.toLocaleString()} steps
        </div>
      )}

      <div
        className={`space-y-0.5 font-mono text-[9px] ${theme.muted}`}
        data-testid="trace-rows"
      >
        {rows.map((s, i) => (
          <div key={i} className="flex gap-2 whitespace-pre">
            <span className="w-6 text-right">{s.pc}</span>
            <span className="w-10">{s.op}</span>
            <span className="w-14 text-right">{s.gas}</span>
            <span>d{s.depth}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
