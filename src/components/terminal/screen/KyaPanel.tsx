/**
 * @file KyaPanel.tsx
 * @description FORENSIC SCREEN KYA panel — ADDRESS → heuristic v1 history (#17/#170)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "../types";
import {
  KYA_LEGAL_FOOTER,
  isValidKyaAddress,
  type KyaResult
} from "../../../lib/chainIntel";

export type KyaRunArgs = { address: string; hops?: number };

export type KyaRunResult =
  | { ok: true; data: KyaResult }
  | { ok: false; error: string };

export function canRunKya(args: {
  address: string;
  running?: boolean;
}): boolean {
  return isValidKyaAddress(args.address) && !args.running;
}

function bandClass(band: KyaResult["band"], theme: ThemeConfig): string {
  if (band === "clear") return theme.primary;
  return theme.warn || theme.muted;
}

export function KyaResultCard({
  data,
  theme
}: {
  data: KyaResult;
  theme: ThemeConfig;
}) {
  return (
    <div
      className={`p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} w-full text-[10px] space-y-1.5 tabular-nums`}
      data-testid="kya-result-card"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`uppercase text-[10px] font-bold ${theme.primary}`}>
          KYA
        </span>
        <span className={theme.muted}>{data.chainName}</span>
        <span
          className={`uppercase text-[9px] tracking-widest ${theme.muted}`}
          data-testid="kya-heuristic-badge"
        >
          heuristic v1
        </span>
      </div>

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>BAND</span>
        <span
          className={`uppercase font-bold ${bandClass(data.band, theme)}`}
          data-testid="kya-band"
        >
          {data.band}
        </span>
      </div>

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>ADDRESS</span>
        <span className="font-mono break-all normal-case">{data.address}</span>
      </div>

      {data.ens && (
        <div className="flex justify-between gap-2">
          <span className={theme.muted}>ENS</span>
          <span className="normal-case">{data.ens}</span>
        </div>
      )}

      {data.firstSeen && (
        <div className="flex justify-between gap-2">
          <span className={theme.muted}>FIRST</span>
          <span className="font-mono tabular-nums normal-case">
            block {data.firstSeen.block}
          </span>
        </div>
      )}
      {data.lastSeen && (
        <div className="flex justify-between gap-2">
          <span className={theme.muted}>LAST</span>
          <span className="font-mono tabular-nums normal-case">
            block {data.lastSeen.block}
          </span>
        </div>
      )}

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>SAMPLED</span>
        <span className="tabular-nums">
          {data.sampledTxCount}
          {data.truncated ? " (truncated)" : ""}
        </span>
      </div>

      <div className="flex justify-between gap-2">
        <span className={theme.muted}>NATIVE IN</span>
        <span className="font-mono tabular-nums">{data.nativeInWei} wei</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className={theme.muted}>NATIVE OUT</span>
        <span className="font-mono tabular-nums">{data.nativeOutWei} wei</span>
      </div>

      {data.subjectLabels.length > 0 && (
        <div className="space-y-1" data-testid="kya-subject-labels">
          <span className={`uppercase text-[9px] ${theme.muted}`}>LABELS</span>
          {data.subjectLabels.map((lab) => (
            <div key={lab.address + lab.kind} className="flex justify-between gap-2">
              <span className="normal-case">{lab.name}</span>
              <span
                className={`uppercase ${
                  lab.kind === "ofac" || lab.kind === "mixer"
                    ? theme.warn || theme.muted
                    : theme.muted
                }`}
              >
                {lab.kind}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.counterparties.length > 0 && (
        <div className="space-y-1" data-testid="kya-counterparties">
          <span className={`uppercase text-[9px] ${theme.muted}`}>
            COUNTERPARTIES
          </span>
          {data.counterparties.map((c) => (
            <div key={c.address} className="flex justify-between gap-2">
              <span className="font-mono break-all normal-case">{c.address}</span>
              <span className={`tabular-nums ${theme.muted}`}>
                {c.txCount}
                {c.label ? ` · ${c.label.kind}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.truncated && (
        <div className={theme.warn || theme.muted} data-testid="kya-truncated">
          History sampled (cap hit). Not a full-chain audit.
        </div>
      )}

      <div
        className={`pt-1 ${theme.muted} text-[9px] normal-case`}
        data-testid="kya-legal-footer"
      >
        {KYA_LEGAL_FOOTER}
      </div>
    </div>
  );
}

export default function KyaPanel({
  theme,
  onClose,
  onRun,
  defaultAddress = "",
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onRun: (args: KyaRunArgs) => Promise<KyaRunResult>;
  /** Soft: prefill active wallet when connected. */
  defaultAddress?: string;
  frameless?: boolean;
}) {
  const initial = defaultAddress || "";
  const [address, setAddress] = useState(initial);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KyaResult | null>(null);
  const [attemptedRun, setAttemptedRun] = useState(false);
  const [addressDirty, setAddressDirty] = useState(false);
  const [addressBlurred, setAddressBlurred] = useState(false);

  useEffect(() => {
    if (!addressDirty && defaultAddress && !address) {
      setAddress(defaultAddress);
    }
  }, [defaultAddress, address, addressDirty]);

  const addressOk = isValidKyaAddress(address);
  const canRun = canRunKya({ address, running });
  const preview = `kya ${address.trim() || "…"}`;
  const showAddrWarn =
    !addressOk && (attemptedRun || (addressDirty && addressBlurred));

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
    if (!canRunKya({ address })) return;
    setError(null);
    setAttemptedRun(false);
    setRunning(true);
    try {
      const res = await onRun({ address: address.trim() });
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
    if (!canRunKya({ address })) {
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
      data-testid="kya-panel"
      role="dialog"
      aria-label="Kya"
    >
      {!frameless && (
        <div className="flex items-center justify-between gap-2">
          <span
            className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
          >
            KYA
          </span>
        </div>
      )}

      <div className={`text-[9px] ${theme.muted}`}>
        Address history — read-only, heuristic v1.
      </div>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>ADDRESS</span>
        <input
          type="text"
          value={address}
          onChange={(e) => {
            const v = e.target.value;
            setAddress(v);
            setAddressDirty(v !== initial);
          }}
          onBlur={() => setAddressBlurred(true)}
          placeholder="0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="kya-address"
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
        data-testid="kya-run"
      >
        {running ? "…" : "RUN"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="kya-preview"
      >
        {preview}
      </div>
      {showAddrWarn && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="kya-warn-address"
          role="alert"
        >
          Enter a 0x address.
        </div>
      )}
      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="kya-error"
          role="alert"
        >
          {error}
        </div>
      )}
      {result && <KyaResultCard data={result} theme={theme} />}
    </div>
  );
}
