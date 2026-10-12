/**
 * @file DigVerPanel.tsx
 * @description DEV BUILD SOLC VER panel — phosphor version chips (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "../../types";
import { loadDigSolcVersion, saveDigSolcVersion } from "../idb";
import { DIG_PINNED_VERSIONS } from "../version";
import { DigPanelShell, DIG_PANEL_TOUCH } from "./DigPanelShell";

export default function DigVerPanel({
  theme,
  onClose
}: {
  theme: ThemeConfig;
  onClose: () => void;
}) {
  const [active, setActive] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadDigSolcVersion().then((v) => {
      if (!cancelled) setActive(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pick = async (v: string) => {
    if (busy || v === active) return;
    setBusy(true);
    try {
      await saveDigSolcVersion(v);
      setActive(v);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DigPanelShell theme={theme} title="SOLC VER" onClose={onClose} testId="dig-ver-panel">
      <div className="flex flex-col gap-2">
        <div className={`text-[10px] ${theme.muted}`}>
          Active{" "}
          <span className={`font-mono ${theme.text}`} data-testid="dig-ver-active">
            {active || "…"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5" data-testid="dig-ver-chips">
          {DIG_PINNED_VERSIONS.map((v) => {
            const on = v === active;
            return (
              <button
                key={v}
                type="button"
                disabled={busy}
                onClick={() => void pick(v)}
                className={`uppercase tracking-widest text-[10px] px-2.5 py-1.5 border cursor-pointer font-mono ${DIG_PANEL_TOUCH} ${
                  on ? "border-transparent font-bold" : `${theme.border} ${theme.muted}`
                }`}
                style={
                  on ? { background: theme.phosphor, color: "#000000" } : undefined
                }
                data-testid={`dig-ver-chip-${v}`}
              >
                {v}
              </button>
            );
          })}
        </div>
        <div className={`text-[9px] ${theme.muted}`}>
          wasm only · matches dig ver
        </div>
      </div>
    </DigPanelShell>
  );
}
