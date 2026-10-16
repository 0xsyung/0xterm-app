/**
 * @file SnapshotPanel.tsx
 * @description INVEST-only SNAPSHOT panel — record P/L baseline (#167)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "../types";
import { INVEST_PANEL_CHAT_GUTTER_CLASS } from "../widgets/floatingChatLayout";

export type SnapshotRecordArgs = {
  label: string;
};

export type SnapshotRecordResult =
  | { ok: true; label: string; count: number; time: string }
  | { ok: false; error: string };

export function defaultSnapshotLabel(): string {
  return `snapshot-${Date.now().toString().slice(-6)}`;
}

export default function SnapshotPanel({
  theme,
  onClose,
  onRecord,
  isConnected = false,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onRecord: (args: SnapshotRecordArgs) => Promise<SnapshotRecordResult>;
  isConnected?: boolean;
  frameless?: boolean;
}) {
  const [label, setLabel] = useState("now");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canRecord = isConnected && !running && label.trim().length > 0;

  const handleRecord = async () => {
    if (!isConnected) {
      setError("Wallet not connected.");
      setSuccess(null);
      return;
    }
    if (!canRecord) return;
    setError(null);
    setSuccess(null);
    setRunning(true);
    try {
      const res = await onRecord({ label: label.trim() || "now" });
      if (res.ok) {
        setSuccess(
          `[✓] Snapshot "${res.label}" saved (${res.count} holdings) at ${res.time}.`
        );
      } else {
        setError(res.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";
  const preview = `snapshot ${label.trim() || "…"}`;

  return (
    <div
      className={`w-full flex flex-col gap-3 ${INVEST_PANEL_CHAT_GUTTER_CLASS} ${
        frameless
          ? ""
          : `max-w-[390px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="snapshot-panel"
      role="dialog"
      aria-label="Snapshot"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          SNAPSHOT
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close snapshot panel"
          className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${touch}`}
          data-testid="snapshot-panel-close"
        >
          ×
        </button>
      </div>

      <div className={`text-[9px] ${theme.muted}`}>
        Saves a P/L baseline to this wallet’s prefs.
      </div>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>LABEL</span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="now / snapshot-…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="snapshot-label"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        onClick={() => void handleRecord()}
        aria-disabled={!canRecord}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer ${
          canRecord ? "" : "opacity-40"
        } ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="snapshot-record"
      >
        {running ? "…" : "RECORD SNAPSHOT"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="snapshot-preview"
      >
        {preview}
      </div>

      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="snapshot-error"
          role="alert"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className={`text-[10px] ${theme.primary}`}
          data-testid="snapshot-success"
          role="status"
        >
          {success}
        </div>
      )}
    </div>
  );
}
