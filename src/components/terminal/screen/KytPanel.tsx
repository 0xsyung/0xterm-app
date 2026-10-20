/**
 * @file KytPanel.tsx
 * @description FORENSIC SCREEN KYT panel — TXHASH → heuristic v1 hop screen (#16/#170)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "../types";
import {
  KYT_LEGAL_FOOTER,
  isValidKytTxHash,
  type KytResult
} from "../../../lib/chainIntel";

export type KytRunArgs = { txHash: string; hops?: number };

export type KytRunResult =
  | { ok: true; data: KytResult }
  | { ok: false; error: string };

export function canRunKyt(args: {
  txHash: string;
  running?: boolean;
}): boolean {
  return isValidKytTxHash(args.txHash) && !args.running;
}

const INITIAL_TXHASH = "";

function bandClass(band: KytResult["band"], theme: ThemeConfig): string {
  if (band === "clear") return theme.primary;
  return theme.warn || theme.muted;
}

export function KytResultCard({
  data,
  theme
}: {
  data: KytResult;
  theme: ThemeConfig;
}) {
  return (
    <div
      className={`p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} w-full text-[10px] space-y-1.5 tabular-nums`}
      data-testid="kyt-result-card"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`uppercase text-[10px] font-bold ${theme.primary}`}>
          KYT
        </span>
        <span className={theme.muted}>{data.chainName}</span>
        <span
          className={`uppercase text-[9px] tracking-widest ${theme.muted}`}
          data-testid="kyt-heuristic-badge"
        >
          heuristic v1
        </span>
      </div>

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>BAND</span>
        <span
          className={`uppercase font-bold ${bandClass(data.band, theme)}`}
          data-testid="kyt-band"
        >
          {data.band}
        </span>
      </div>

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>TX</span>
        <span className="font-mono break-all normal-case">{data.txHash}</span>
      </div>

      {data.from && (
        <div className="flex justify-between gap-2">
          <span className={theme.muted}>FROM</span>
          <span className="font-mono break-all normal-case">{data.from}</span>
        </div>
      )}
      {data.to && (
        <div className="flex justify-between gap-2">
          <span className={theme.muted}>TO</span>
          <span className="font-mono break-all normal-case">{data.to}</span>
        </div>
      )}

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>VALUE</span>
        <span className="font-mono tabular-nums">{data.valueWei} wei</span>
      </div>

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>HOPS</span>
        <span className="tabular-nums">
          {data.hopsRequested}
          {data.truncated ? " (truncated)" : ""}
        </span>
      </div>

      {data.hits.length > 0 && (
        <div className="space-y-1" data-testid="kyt-hits">
          <span className={`uppercase text-[9px] ${theme.muted}`}>HITS</span>
          {data.hits.map((h) => (
            <div
              key={`${h.address}-${h.hop}-${h.label.kind}`}
              className="flex justify-between gap-2"
            >
              <span className="font-mono break-all normal-case">{h.address}</span>
              <span
                className={`uppercase ${
                  h.label.kind === "ofac" || h.label.kind === "mixer"
                    ? theme.warn || theme.muted
                    : theme.muted
                }`}
              >
                {h.label.kind} · hop {h.hop}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.truncated && (
        <div className={theme.warn || theme.muted} data-testid="kyt-truncated">
          Graph truncated (heuristic v1).
        </div>
      )}

      <div
        className={`pt-1 ${theme.muted} text-[9px] normal-case`}
        data-testid="kyt-legal-footer"
      >
        {KYT_LEGAL_FOOTER}
      </div>
    </div>
  );
}

export default function KytPanel({
  theme,
  onClose,
  onRun,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onRun: (args: KytRunArgs) => Promise<KytRunResult>;
  frameless?: boolean;
}) {
  const [txHash, setTxHash] = useState(INITIAL_TXHASH);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KytResult | null>(null);
  const [attemptedRun, setAttemptedRun] = useState(false);
  const [txHashDirty, setTxHashDirty] = useState(false);
  const [txHashBlurred, setTxHashBlurred] = useState(false);

  const txHashOk = isValidKytTxHash(txHash);
  const canRun = canRunKyt({ txHash, running });
  const preview = `kyt ${txHash.trim() || "…"}`;
  const showHashWarn =
    !txHashOk && (attemptedRun || (txHashDirty && txHashBlurred));

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
    if (!canRunKyt({ txHash })) return;
    setError(null);
    setAttemptedRun(false);
    setRunning(true);
    try {
      const res = await onRun({ txHash: txHash.trim() });
      if (res.ok) {
        setResult(res.data);
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

  const handleRunClick = () => {
    if (running) return;
    if (!canRunKyt({ txHash })) {
      setAttemptedRun(true);
      return;
    }
    void run();
  };

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  return (
    <div
      className={`w-full flex flex-col gap-3 ${
        frameless
          ? ""
          : `max-w-[390px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="kyt-panel"
      role="dialog"
      aria-label="Kyt"
    >
      {!frameless && (
        <div className="flex items-center justify-between gap-2">
          <span
            className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
          >
            KYT
          </span>
        </div>
      )}

      <div className={`text-[9px] ${theme.muted}`}>
        Tx hop/risk screen — read-only, heuristic v1.
      </div>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>TXHASH</span>
        <input
          type="text"
          value={txHash}
          onChange={(e) => {
            const v = e.target.value;
            setTxHash(v);
            setTxHashDirty(v !== INITIAL_TXHASH);
          }}
          onBlur={() => setTxHashBlurred(true)}
          placeholder="0x + 64 hex chars"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="kyt-txhash"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        onClick={handleRunClick}
        aria-disabled={!canRun}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer ${
          canRun ? "" : "opacity-40"
        } ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="kyt-run"
      >
        {running ? "…" : "RUN"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="kyt-preview"
      >
        {preview}
      </div>
      {showHashWarn && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="kyt-warn-hash"
          role="alert"
        >
          TXHASH must be 0x + 64 hex chars.
        </div>
      )}
      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="kyt-error"
          role="alert"
        >
          {error}
        </div>
      )}
      {result && <KytResultCard data={result} theme={theme} />}
    </div>
  );
}
