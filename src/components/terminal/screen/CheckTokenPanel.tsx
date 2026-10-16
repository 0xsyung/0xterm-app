/**
 * @file CheckTokenPanel.tsx
 * @description FORENSIC SCREEN CHECK TOKEN — ADDRESS → ERC-165/20/721 (#170)
 * Soft ACK: forensic SIM/TRACE chrome — NOT DigPanelShell / dig-check.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import type { ThemeConfig } from "../types";

export type CheckTokenArgs = { address: string };

export type CheckTokenSuccess = {
  address: string;
  chainName: string;
  lines: string[];
};

export type CheckTokenResult =
  | { ok: true; data: CheckTokenSuccess }
  | { ok: false; error: string };

export function isValidCheckTokenAddress(address: string): boolean {
  const t = address.trim();
  return t.length > 0 && isAddress(t);
}

export function canCheckToken(args: {
  address: string;
  running?: boolean;
}): boolean {
  return isValidCheckTokenAddress(args.address) && !args.running;
}

export function CheckTokenResultCard({
  data,
  theme
}: {
  data: CheckTokenSuccess;
  theme: ThemeConfig;
}) {
  return (
    <div
      className={`p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} w-full text-[10px] space-y-1.5 tabular-nums`}
      data-testid="check-token-result-card"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`uppercase text-[10px] font-bold ${theme.primary}`}>
          CHECK TOKEN
        </span>
        <span className={theme.muted}>{data.chainName}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className={theme.muted}>ADDRESS</span>
        <span className="font-mono break-all normal-case">{data.address}</span>
      </div>
      <pre
        className={`text-[10px] font-mono whitespace-pre-wrap m-0 ${theme.text}`}
        data-testid="check-token-lines"
        style={{ overflowWrap: "anywhere" }}
      >
        {data.lines.join("\n")}
      </pre>
      <div className={`pt-1 ${theme.muted} text-[9px] normal-case`}>
        ABI / ERC-165 interface check only — not a KYT/KYA screen.
      </div>
    </div>
  );
}

const INITIAL_ADDRESS = "";

export default function CheckTokenPanel({
  theme,
  onClose,
  onCheck,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onCheck: (args: CheckTokenArgs) => Promise<CheckTokenResult>;
  frameless?: boolean;
}) {
  const [address, setAddress] = useState(INITIAL_ADDRESS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckTokenSuccess | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [addressDirty, setAddressDirty] = useState(false);
  const [addressBlurred, setAddressBlurred] = useState(false);

  const addressOk = isValidCheckTokenAddress(address);
  const canRun = canCheckToken({ address, running });
  const preview = `is ${address.trim() || "…"}`;
  const showAddrWarn =
    !addressOk && (attempted || (addressDirty && addressBlurred));

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
    if (!canCheckToken({ address })) return;
    setError(null);
    setAttempted(false);
    setRunning(true);
    try {
      const res = await onCheck({ address: address.trim() });
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

  const handleCheckClick = () => {
    if (running) return;
    if (!canCheckToken({ address })) {
      setAttempted(true);
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
      data-testid="check-token-panel"
      role="dialog"
      aria-label="Check Token"
    >
      {!frameless && (
        <div className="flex items-center justify-between gap-2">
          <span
            className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
          >
            CHECK TOKEN
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close check token panel"
            className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${touch}`}
            data-testid="check-token-panel-close"
          >
            ×
          </button>
        </div>
      )}

      <div className={`text-[9px] ${theme.muted}`}>
        ERC-20 / ERC-721 interface check — read-only.
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
          data-testid="check-token-address"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        onClick={handleCheckClick}
        aria-disabled={!canRun}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer ${
          canRun ? "" : "opacity-40"
        } ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="check-token-check"
      >
        {running ? "…" : "CHECK"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="check-token-preview"
      >
        {preview}
      </div>
      {showAddrWarn && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="check-token-warn-address"
          role="alert"
        >
          Enter a token address.
        </div>
      )}
      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="check-token-error"
          role="alert"
        >
          {error}
        </div>
      )}
      {result && <CheckTokenResultCard data={result} theme={theme} />}
    </div>
  );
}
