/**
 * @file InfoPanel.tsx
 * @description FORENSIC READ TOKEN INFO panel — address → on-chain metadata (#171)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import type { ThemeConfig } from "../types";

export type InfoLookupArgs = {
  address: string;
};

export type InfoTokenTag = "ERC-20" | "ERC-721" | "ERC-165";

export type InfoLookupSuccess = {
  address: string;
  chainName: string;
  name: string;
  symbol: string;
  decimals?: number;
  supply: string;
  tags: InfoTokenTag[];
  /** Full explorer address URL, or null when chain has no explorer. */
  explorerHref: string | null;
  /** Uppercase short name for VIEW ON {label}. */
  explorerLabel: string;
  /** Soft: connected wallet ERC-20 balance line, when available. */
  connectedBalance?: string | null;
};

export type InfoLookupResult =
  | { ok: true; data: InfoLookupSuccess }
  | { ok: false; error: string };

/** True when ADDRESS is a non-empty 0x address (viem isAddress). */
export function isValidInfoAddress(address: string): boolean {
  const t = address.trim();
  return t.length > 0 && isAddress(t);
}

/** Gate for LOOKUP — valid address and not running. */
export function canLookupInfo(args: {
  address: string;
  running?: boolean;
}): boolean {
  return isValidInfoAddress(args.address) && !args.running;
}

/** Soft ACK explorer label: uppercase name when known, else EXPLORER. */
export function explorerViewLabel(name?: string | null): string {
  const t = (name || "").trim();
  if (!t) return "EXPLORER";
  return t.toUpperCase();
}

const INITIAL_ADDRESS = "";

export default function InfoPanel({
  theme,
  onClose,
  onLookup,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onLookup: (args: InfoLookupArgs) => Promise<InfoLookupResult>;
  /** Inline mode: drop the outer card frame (border/bg/rounded/padding). */
  frameless?: boolean;
}) {
  const [address, setAddress] = useState(INITIAL_ADDRESS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InfoLookupSuccess | null>(null);
  /** After first invalid LOOKUP click this mount — surface yellow field warns (#132/#164). */
  const [attemptedLookup, setAttemptedLookup] = useState(false);
  const [addressDirty, setAddressDirty] = useState(false);
  const [addressBlurred, setAddressBlurred] = useState(false);

  const canLookup = canLookupInfo({ address, running });
  const preview = `info ${address.trim() || "…"}`;

  const showAddressWarn =
    !isValidInfoAddress(address) &&
    (attemptedLookup || (addressDirty && addressBlurred));

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

  const lookup = async () => {
    if (!canLookupInfo({ address })) return;
    setError(null);
    setAttemptedLookup(false);
    setRunning(true);
    try {
      const res = await onLookup({ address: address.trim() });
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

  const handleLookupClick = () => {
    if (running) return;
    if (!canLookupInfo({ address })) {
      setAttemptedLookup(true);
      return;
    }
    void lookup();
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
      data-testid="info-panel"
      role="dialog"
      aria-label="Token info"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          TOKEN INFO
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close token info panel"
          className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${touch}`}
          data-testid="info-panel-close"
        >
          ×
        </button>
      </div>

      <div className={`text-[9px] ${theme.muted}`}>
        Read-only on-chain metadata — never sends.
      </div>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>ADDRESS</span>
        <input
          type="text"
          value={address}
          onChange={(e) => {
            const v = e.target.value;
            setAddress(v);
            setAddressDirty(v !== INITIAL_ADDRESS);
          }}
          onBlur={() => setAddressBlurred(true)}
          placeholder="0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="info-address"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        onClick={handleLookupClick}
        aria-disabled={!canLookup}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer ${
          canLookup ? "" : "opacity-40"
        } ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="info-lookup"
      >
        {running ? "…" : "LOOKUP"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="info-preview"
      >
        {preview}
      </div>
      {showAddressWarn && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="info-warn-address"
          role="alert"
        >
          Enter a contract address.
        </div>
      )}
      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="info-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {result && (
        <div
          data-testid="info-result"
          className={`border ${theme.border} ${theme.cardBg} p-2.5 flex flex-col gap-1.5`}
        >
          <div className={`font-mono text-[11px] ${theme.text}`}>
            {result.address}
            <span className={` ${theme.muted}`}> · {result.chainName}</span>
          </div>
          <div className={`text-[11px] ${theme.text}`}>
            {result.name || "—"}
            <span className={` ${theme.muted}`}>
              {" "}
              · {result.symbol || "—"}
            </span>
          </div>
          {result.decimals !== undefined && (
            <div className={`text-[10px] ${theme.muted}`}>
              Decimals{" "}
              <span className={theme.text}>{result.decimals}</span>
            </div>
          )}
          <div className={`text-[10px] ${theme.muted}`}>
            Supply{" "}
            <span className={theme.text}>{result.supply || "n/a"}</span>
          </div>
          {result.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5" data-testid="info-tags">
              {result.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center px-1.5 py-0.5 border ${theme.border} uppercase tracking-widest text-[9px] ${theme.primary}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {result.connectedBalance ? (
            <div
              className={`text-[10px] ${theme.muted}`}
              data-testid="info-connected-balance"
            >
              Balance · {result.connectedBalance}
            </div>
          ) : null}
          {result.explorerHref ? (
            <a
              href={result.explorerHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`uppercase tracking-widest text-[9px] pt-1 ${theme.primary} cursor-pointer`}
              data-testid="info-explorer-link"
            >
              VIEW ON {result.explorerLabel} →
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
