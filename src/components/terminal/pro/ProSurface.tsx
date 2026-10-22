/**
 * @file ProSurface.tsx
 * @description Floating buy/status chrome host (Soft ACK #139 Design H)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 *
 * Escape dismiss; no workspace × (WillPanel pattern — Soft Design H).
 */
"use client";

import type { ThemeConfig } from "../types";
import type { ProStatus } from "./status";
import ProBuyPanel from "./ProBuyPanel";
import ProStatusPanel from "./ProStatusPanel";

export type ProSurfaceMode = "buy" | "status";

export default function ProSurface({
  theme,
  mode,
  onClose,
  onSwitchBuy,
  pricePerPeriod,
  priceLoading,
  priceError,
  busy,
  onConfirmBuy,
  status,
  statusLoading,
  statusError
}: {
  theme: ThemeConfig;
  mode: ProSurfaceMode;
  onClose: () => void;
  onSwitchBuy: () => void;
  pricePerPeriod: bigint | null;
  priceLoading?: boolean;
  priceError?: string | null;
  busy?: boolean;
  onConfirmBuy: (periods: number) => void | Promise<void>;
  status: Extract<ProStatus, { ok: true }> | null;
  statusLoading?: boolean;
  statusError?: string | null;
}) {
  return (
    <div
      className="absolute top-[calc(48px_+_env(safe-area-inset-top)_+_0.5rem)] right-[calc(0.75rem_+_env(safe-area-inset-right))] z-40 max-md:left-[calc(0.75rem_+_env(safe-area-inset-left))] max-md:right-[calc(0.75rem_+_env(safe-area-inset-right))]"
      data-testid="pro-surface"
    >
      {mode === "buy" ? (
        <ProBuyPanel
          theme={theme}
          onClose={onClose}
          pricePerPeriod={pricePerPeriod}
          priceLoading={priceLoading}
          priceError={priceError}
          busy={busy}
          onConfirm={onConfirmBuy}
        />
      ) : (
        <ProStatusPanel
          theme={theme}
          onClose={onClose}
          status={status}
          loading={statusLoading}
          error={statusError}
          onRenew={onSwitchBuy}
        />
      )}
    </div>
  );
}
