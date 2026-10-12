/**
 * @file DigCheckPanel.tsx
 * @description DEV SHIP CHECK TOKEN — address → is result (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useState } from "react";
import type { ThemeConfig } from "../../types";
import {
  DigEmptyBody,
  DigPanelShell,
  DigPrimaryButton,
  DIG_PANEL_TOUCH
} from "./DigPanelShell";

export default function DigCheckPanel({
  theme,
  onClose,
  onCheck
}: {
  theme: ThemeConfig;
  onClose: () => void;
  /** Run `is <address>` (or typed variant) and return monospace result lines. */
  onCheck: (address: string) => Promise<{ ok: true; lines: string[] } | { ok: false; error: string }>;
}) {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<string[] | null>(null);

  const run = async () => {
    if (!address.trim()) {
      setAttempted(true);
      return;
    }
    setBusy(true);
    setError(null);
    setLines(null);
    try {
      const res = await onCheck(address.trim());
      if (res.ok) setLines(res.lines);
      else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DigPanelShell theme={theme} title="CHECK TOKEN" onClose={onClose} testId="dig-check-panel">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className={`uppercase text-[9px] ${theme.muted}`}>ADDRESS</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x…"
            className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${DIG_PANEL_TOUCH}`}
            data-testid="dig-check-address"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <DigPrimaryButton
          theme={theme}
          label={busy ? "…" : "CHECK"}
          onClick={() => void run()}
          disabled={busy}
          testId="dig-check-cta"
        />
        {attempted && !address.trim() && (
          <DigEmptyBody theme={theme} message="Enter a token address." />
        )}
        {error && (
          <div className={`text-[10px] ${theme.warn || theme.muted}`} role="alert">
            {error}
          </div>
        )}
        {lines && (
          <pre
            className={`text-[10px] font-mono whitespace-pre-wrap m-0 ${theme.text}`}
            data-testid="dig-check-result"
            style={{ overflowWrap: "anywhere" }}
          >
            {lines.join("\n")}
          </pre>
        )}
      </div>
    </DigPanelShell>
  );
}
