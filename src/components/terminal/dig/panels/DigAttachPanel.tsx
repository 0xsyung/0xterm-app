/**
 * @file DigAttachPanel.tsx
 * @description DEV SHIP ATTACH — address (+ optional name) → DigRun (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useState } from "react";
import type { ThemeConfig } from "../../types";
import DigRunWidget from "../../widgets/DigRunWidget";
import type { DigRunPanelState } from "../session";
import type { DigResult } from "../runDig";
import { flattenDig } from "./flattenDig";
import {
  DigEmptyBody,
  DigPanelShell,
  DigPrimaryButton,
  DIG_PANEL_TOUCH
} from "./DigPanelShell";

export default function DigAttachPanel({
  theme,
  onClose,
  onDig,
  onFillPrompt,
  onPinRun
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onDig: (line: string) => Promise<DigResult>;
  onFillPrompt?: (text: string) => void;
  onPinRun?: (panel: DigRunPanelState) => void;
}) {
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runPanel, setRunPanel] = useState<DigRunPanelState | null>(null);
  const [attempted, setAttempted] = useState(false);

  const attach = async () => {
    if (!address.trim()) {
      setAttempted(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const line = name.trim()
        ? `dig at ${address.trim()} ${name.trim()}`
        : `dig at ${address.trim()}`;
      const result = await onDig(line);
      const flat = flattenDig(result);
      for (const r of flat) {
        if (r.kind === "run") {
          setRunPanel(r.panel);
          return;
        }
        if (r.kind === "text") {
          setError(r.text);
          return;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DigPanelShell theme={theme} title="ATTACH" onClose={onClose} testId="dig-attach-panel">
      {runPanel ? (
        <DigRunWidget
          panel={runPanel}
          theme={theme}
          onFillPrompt={onFillPrompt}
          onPin={onPinRun ? () => onPinRun(runPanel) : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className={`uppercase text-[9px] ${theme.muted}`}>ADDRESS</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x…"
              className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${DIG_PANEL_TOUCH}`}
              data-testid="dig-attach-address"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={`uppercase text-[9px] ${theme.muted}`}>CONTRACT</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="optional name"
              className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${DIG_PANEL_TOUCH}`}
              data-testid="dig-attach-name"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <DigPrimaryButton
            theme={theme}
            label={busy ? "…" : "ATTACH"}
            onClick={() => void attach()}
            disabled={busy}
            testId="dig-attach-cta"
          />
          {attempted && !address.trim() && (
            <div className={`text-[10px] ${theme.warn || theme.muted}`}>
              0x… address required
            </div>
          )}
          {error && <DigEmptyBody theme={theme} message={error} />}
        </div>
      )}
    </DigPanelShell>
  );
}
