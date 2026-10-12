/**
 * @file DigDebugPanel.tsx
 * @description DEV SHIP DEBUG panel (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeConfig } from "../../types";
import DigDebugWidget from "../../widgets/DigDebugWidget";
import type { DigDebugPanelState } from "../debug";
import { panelFromSession } from "../debug";
import { getDigDebugSession } from "../session";
import type { DigResult } from "../runDig";
import { flattenDig } from "./flattenDig";
import { DigEmptyBody, DigPanelShell } from "./DigPanelShell";

export default function DigDebugPanel({
  theme,
  onClose,
  onDig,
  onCommand,
  onPinDebug
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onDig: (line: string) => Promise<DigResult>;
  onCommand?: (cmd: string) => void;
  onPinDebug?: (panel: DigDebugPanelState) => void;
}) {
  const [panel, setPanel] = useState<DigDebugPanelState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshFromSession = useCallback(() => {
    const sess = getDigDebugSession();
    if (sess) {
      setPanel(panelFromSession(sess));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (refreshFromSession()) return;
      // Try starting debug on last VM tx
      try {
        const result = await onDig("dig debug");
        if (cancelled) return;
        const flat = flattenDig(result);
        for (const r of flat) {
          if (r.kind === "debug" && !r.stop) {
            setPanel(r.panel);
            return;
          }
          if (r.kind === "text") {
            setError(
              r.text.includes("no_tx")
                ? "No tx to debug. Deploy/send in VM or dig debug <txhash>."
                : r.text
            );
            return;
          }
        }
        if (!refreshFromSession()) {
          setError("No tx to debug. Deploy/send in VM or dig debug <txhash>.");
        }
      } catch {
        if (!cancelled) {
          setError("No tx to debug. Deploy/send in VM or dig debug <txhash>.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onDig, refreshFromSession]);

  const runStep = async (cmd: string) => {
    const result = await onDig(cmd);
    const flat = flattenDig(result);
    for (const r of flat) {
      if (r.kind === "debug") {
        if (r.stop) {
          setPanel(null);
          setError("No tx to debug. Deploy/send in VM or dig debug <txhash>.");
          return;
        }
        setPanel(r.panel);
        return;
      }
    }
    refreshFromSession();
    onCommand?.(cmd);
  };

  return (
    <DigPanelShell theme={theme} title="DEBUG" onClose={onClose} testId="dig-debug-panel">
      {panel ? (
        <DigDebugWidget
          panel={panel}
          theme={theme}
          onCommand={(cmd) => void runStep(cmd)}
          onPin={onPinDebug ? () => onPinDebug(panel) : undefined}
        />
      ) : (
        <DigEmptyBody
          theme={theme}
          message={error || "No tx to debug. Deploy/send in VM or dig debug <txhash>."}
        />
      )}
    </DigPanelShell>
  );
}
