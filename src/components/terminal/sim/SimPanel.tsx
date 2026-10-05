/**
 * @file SimPanel.tsx
 * @description FORENSIC Sim tool panel — TO/DATA → eth_call dry-run (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ThemeConfig } from "../types";

export type SimRunArgs = {
  to: string;
  data: string;
};

export type SimRunResult =
  | { ok: true; component: ReactNode }
  | { ok: false; error: string };

/** Normalize data hex to `0x` + even lowercase hex (or "0x0" for empty). */
export function normalizeSimData(raw: string): string {
  const t = raw.trim();
  if (!t) return "0x0";
  const stripped = t.replace(/^0x/, "");
  return `0x${stripped.toLowerCase() || "0"}`;
}

/** True when TO is a non-empty checksummed address. */
export function isValidSimTo(to: string): boolean {
  const t = to.trim();
  return t.length > 0;
}

/** True when DATA is empty or 0x-prefixed hex. */
export function isValidSimData(data: string): boolean {
  const t = data.trim();
  return t === "" || /^0x[0-9a-fA-F]*$/.test(t);
}

/** Gate for RUN — TO filled, DATA valid (empty = "0x0"), not running. */
export function canRunSim(args: {
  to: string;
  data: string;
  running?: boolean;
}): boolean {
  return (
    isValidSimTo(args.to) &&
    isValidSimData(args.data) &&
    !args.running
  );
}

export default function SimPanel({
  theme,
  onClose,
  onRun,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onRun: (args: SimRunArgs) => Promise<SimRunResult>;
  /** Inline mode: drop the outer card frame (border/bg/rounded/padding). */
  frameless?: boolean;
}) {
  const [to, setTo] = useState("");
  const [data, setData] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReactNode | null>(null);

  const canRun = canRunSim({ to, data, running });
  const preview = `sim ${to.trim() || "…"} ${data.trim() || "0x0"}`;

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

  const run = async () => {
    if (!canRunSim({ to, data })) return;
    setError(null);
    setRunning(true);
    try {
      const res = await onRun({ to: to.trim(), data: normalizeSimData(data) });
      if (res.ok) {
        setResult(res.component);
      } else {
        setResult(null);
        setError(res.error);
      }
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  return (
    <div
      className={`w-full flex flex-col gap-3 ${
        frameless ? "" : `max-w-[390px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="sim-panel"
      role="dialog"
      aria-label="Sim"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          SIM
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sim panel"
          className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${touch}`}
          data-testid="sim-panel-close"
        >
          ×
        </button>
      </div>

      <div className={`text-[9px] ${theme.muted}`}>
        eth_call dry-run — read-only, never sends.
      </div>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>TO</span>
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="sim-to"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>DATA</span>
        <input
          type="text"
          value={data}
          onChange={(e) => setData(e.target.value)}
          placeholder="0x… (empty = 0x0)"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="sim-data"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        onClick={() => void run()}
        disabled={!canRun}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="sim-run"
      >
        {running ? "…" : "RUN"}
      </button>
      <div className={`text-[9px] ${theme.muted} font-mono`} data-testid="sim-preview">
        {preview}
      </div>
      {!isValidSimTo(to) && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="sim-warn-to"
          role="alert"
        >
          Enter a target address.
        </div>
      )}
      {!isValidSimData(data) && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="sim-warn-data"
          role="alert"
        >
          DATA must be 0x-prefixed hex.
        </div>
      )}
      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="sim-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {result && (
        <div data-testid="sim-result" className="relative">
          {result}
        </div>
      )}
    </div>
  );
}
