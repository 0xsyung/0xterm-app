/**
 * @file DigArtifactPanel.tsx
 * @description DEV BUILD COMPILE panel — DigArtifactWidget + empty (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeConfig } from "../../types";
import DigArtifactWidget from "../../widgets/DigArtifactWidget";
import type { DigContractArtifact } from "../artifact";
import { loadDigArtifacts } from "../idb";
import type { DigResult } from "../runDig";
import { flattenDig } from "./flattenDig";
import {
  DigEmptyBody,
  DigPanelShell,
  DigPrimaryButton
} from "./DigPanelShell";

export default function DigArtifactPanel({
  theme,
  onClose,
  onDig,
  onPinArtifact
}: {
  theme: ThemeConfig;
  onClose: () => void;
  /** Run `dig compile` through shared dig session. */
  onDig: (line: string) => Promise<DigResult>;
  onPinArtifact?: (artifact: DigContractArtifact) => void;
}) {
  const [artifact, setArtifact] = useState<DigContractArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const refresh = useCallback(async () => {
    const arts = await loadDigArtifacts();
    setArtifact(arts[0] ?? null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const compile = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await onDig("dig compile");
      const flat = flattenDig(result);
      const art = flat.find((r) => r.kind === "artifact");
      if (art && art.kind === "artifact") {
        setArtifact(art.artifact);
        return;
      }
      await refresh();
      const warn = flat.find((r) => r.kind === "text" && r.warn);
      if (warn && warn.kind === "text") setError(warn.text);
      const multi = flat.find((r) => r.kind === "multi-text");
      if (multi && multi.kind === "multi-text") {
        const line = multi.lines.find((l) => l.warn) || multi.lines[0];
        if (line) setError(line.text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <DigPanelShell theme={theme} title="COMPILE" onClose={onClose} testId="dig-artifact-panel">
      {!artifact ? (
        <DigEmptyBody theme={theme} message="No artifact. Compile source first.">
          <DigPrimaryButton
            theme={theme}
            label={running ? "…" : "COMPILE"}
            onClick={() => void compile()}
            disabled={running}
            testId="dig-compile-cta"
          />
          {error && (
            <div className={`text-[10px] ${theme.warn || theme.muted}`} role="alert">
              {error}
            </div>
          )}
        </DigEmptyBody>
      ) : (
        <div className="flex flex-col gap-2">
          <DigArtifactWidget
            artifact={artifact}
            theme={theme}
            onPin={
              onPinArtifact ? () => onPinArtifact(artifact) : undefined
            }
          />
          <DigPrimaryButton
            theme={theme}
            label={running ? "…" : "COMPILE"}
            onClick={() => void compile()}
            disabled={running}
            testId="dig-compile-cta"
          />
          {error && (
            <div className={`text-[10px] ${theme.warn || theme.muted}`} role="alert">
              {error}
            </div>
          )}
        </div>
      )}
    </DigPanelShell>
  );
}
