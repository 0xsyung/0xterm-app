/**
 * @file RunConfirmWidget.tsx
 * @description arb run confirm card — mirrors DigConfirmWidget (#27)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import React, { useState } from "react";
import type { Address } from "viem";
import type { ThemeConfig } from "../../types";
import { truncateAddress } from "../../dig/encode";
import { BTN_TOUCH, btnClass } from "../../ui/buttonClasses";

export default function RunConfirmWidget({
  theme,
  pair,
  venues,
  size,
  minProfit,
  executor,
  flashSource,
  onConfirm,
  onCancel
}: {
  theme: ThemeConfig;
  pair: string;
  venues: string;
  size: string;
  minProfit: string;
  executor: Address;
  flashSource: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const touch = BTN_TOUCH;

  return (
    <div
      className={`relative my-3 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} max-w-md ${theme.text}`}
    >
      <div className={`border-b ${theme.border} pb-1 mb-2 text-[10px] tracking-wider ${theme.primary}`}>
        ARB RUN CONFIRM
      </div>
      <div className="space-y-1 text-[10px]">
        <div>
          <span className={theme.muted}>PAIR </span>
          <span className="tabular-nums font-mono">{pair}</span>
        </div>
        <div>
          <span className={theme.muted}>VENUES </span>
          <span className="break-words">{venues}</span>
        </div>
        <div>
          <span className={theme.muted}>SIZE </span>
          <span className="tabular-nums">{size}</span>
        </div>
        <div>
          <span className={theme.muted}>MIN PROFIT </span>
          <span className="tabular-nums">{minProfit}</span>
        </div>
        <div>
          <span className={theme.muted}>FLASH </span>
          <span className="tabular-nums font-mono">{flashSource}</span>
        </div>
        <div>
          <span className={theme.muted}>EXECUTOR </span>
          <span className="tabular-nums font-mono break-all">{truncateAddress(executor)}</span>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          className={btnClass({ theme, variant: "primary", size: "md", className: `${theme.primary} ${theme.cardBg || "bg-transparent"}` })}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          RUN
        </button>
        <button
          type="button"
          disabled={busy}
          className={btnClass({ theme, variant: "secondary", size: "md" })}
          onClick={onCancel}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
