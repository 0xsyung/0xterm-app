/**
 * @file TracePanel.tsx
 * @description FORENSIC Trace tool panel — TXHASH → opcode trace (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ThemeConfig } from "../types";
import { isTxHash } from "./trace";

export type TraceRunArgs = {
  txHash: string;
};

export type TraceRunResult =
  | { ok: true; component: ReactNode }
  | { ok: false; error: string };

/** True when TXHASH is a 0x + 64-hex-char transaction hash. */
export function isValidTxHash(txHash: string): boolean {
  return isTxHash(txHash.trim());
}

/** Gate for RUN — TXHASH valid, not running. */
export function canRunTrace(args: { txHash: string; running?: boolean }): boolean {
  return isValidTxHash(args.txHash) && !args.running;
}

export default function TracePanel({
  theme,
  onClose,
  onRun
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onRun: (args: TraceRunArgs) => Promise<TraceRunResult>;
}) {
  const [txHash, setTxHash] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReactNode | null>(null);

  const txHashOk = isValidTxHash(txHash);
  const canRun = canRunTrace({ txHash, running });
  const preview = `trace ${txHash.trim() || "…"}`;

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
    if (!canRunTrace({ txHash })) return;
    setError(null);
    setRunning(true);
    try {
      const res = await onRun({ txHash: txHash.trim() });
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
      className={`w-full max-w-[390px] flex flex-col gap-3 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`}
      data-testid="trace-panel"
      role="dialog"
      aria-label="Trace"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          TRACE
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close trace panel"
          className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${touch}`}
          data-testid="trace-panel-close"
        >
          ×
        </button>
      </div>

      <div className={`text-[9px] ${theme.muted}`}>
        debug_traceTransaction — read-only opcode trace.
      </div>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>TXHASH</span>
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="0x + 64 hex chars"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="trace-txhash"
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
        data-testid="trace-run"
      >
        {running ? "…" : "RUN"}
      </button>
      <div className={`text-[9px] ${theme.muted} font-mono`} data-testid="trace-preview">
        {preview}
      </div>
      {!txHashOk && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="trace-warn-hash"
          role="alert"
        >
          TXHASH must be 0x + 64 hex chars.
        </div>
      )}
      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="trace-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {result && (
        <div data-testid="trace-result" className="relative">
          {result}
        </div>
      )}
    </div>
  );
}
