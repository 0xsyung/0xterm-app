/**
 * @file DigDeployPanel.tsx
 * @description DEV SHIP DEPLOY — env pills → DigConfirm → DigRun (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useState } from "react";
import type { ThemeConfig } from "../../types";
import DigConfirmWidget from "../../widgets/DigConfirmWidget";
import DigRunWidget from "../../widgets/DigRunWidget";
import type { DigEnvKind } from "../constants";
import { getDigEnv, setDigEnv, type DigRunPanelState } from "../session";
import type { DigConfirmResult, DigResult } from "../runDig";
import { flattenDig } from "./flattenDig";
import {
  DigEmptyBody,
  DigPanelShell,
  DigPrimaryButton,
  DIG_PANEL_TOUCH
} from "./DigPanelShell";

export default function DigDeployPanel({
  theme,
  onClose,
  onDig,
  onConfirmDeploy,
  isConnected,
  onFillPrompt,
  onPinRun
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onDig: (line: string) => Promise<DigResult>;
  /** Wallet path: send the confirm tx and return DigRun panel state. */
  onConfirmDeploy: (confirm: DigConfirmResult) => Promise<DigRunPanelState | { error: string }>;
  isConnected: boolean;
  onFillPrompt?: (text: string) => void;
  onPinRun?: (panel: DigRunPanelState) => void;
}) {
  const [env, setEnv] = useState<DigEnvKind>(() => getDigEnv() || "vm");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<DigConfirmResult | null>(null);
  const [runPanel, setRunPanel] = useState<DigRunPanelState | null>(null);

  const pickEnv = (next: DigEnvKind) => {
    setEnv(next);
    setDigEnv(next);
    setError(null);
    setConfirm(null);
  };

  const deploy = async () => {
    setBusy(true);
    setError(null);
    setConfirm(null);
    try {
      setDigEnv(env);
      if (env !== "vm" && !isConnected) {
        setError("Connect wallet or use VM.");
        return;
      }
      const result = await onDig("dig deploy");
      const flat = flattenDig(result);
      for (const r of flat) {
        if (r.kind === "run") {
          setRunPanel(r.panel);
          return;
        }
        if (r.kind === "confirm") {
          setConfirm(r);
          return;
        }
        if (r.kind === "text" && r.warn) {
          // Map dig.need_wallet to Soft ACK copy
          if (r.text.includes("need_wallet") || r.text.includes("connect")) {
            setError("Connect wallet or use VM.");
          } else {
            setError(r.text);
          }
          return;
        }
        if (r.kind === "multi-text") {
          const line = r.lines.find((l) => l.warn) || r.lines[0];
          if (line) setError(line.text);
          return;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const pill = (active: boolean) =>
    `uppercase tracking-widest text-[10px] px-2.5 py-1.5 border cursor-pointer ${DIG_PANEL_TOUCH} ${
      active ? "border-transparent font-bold" : `${theme.border} ${theme.muted}`
    }`;

  return (
    <DigPanelShell theme={theme} title="DEPLOY" onClose={onClose} testId="dig-deploy-panel">
      {runPanel ? (
        <DigRunWidget
          panel={runPanel}
          theme={theme}
          onFillPrompt={onFillPrompt}
          onPin={onPinRun ? () => onPinRun(runPanel) : undefined}
        />
      ) : confirm ? (
        <DigConfirmWidget
          theme={theme}
          to={confirm.to}
          dataSummary={confirm.dataSummary}
          value={confirm.value}
          gasEstimate={confirm.gasEstimate}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const out = await onConfirmDeploy(confirm);
            if ("error" in out) {
              setError(out.error);
              setConfirm(null);
              return;
            }
            setRunPanel(out);
            setConfirm(null);
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" data-testid="dig-deploy-env">
            {(["vm", "injected"] as const).map((e) => {
              const active = env === e;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => pickEnv(e)}
                  className={pill(active)}
                  style={
                    active
                      ? { background: theme.phosphor, color: "#000000" }
                      : undefined
                  }
                >
                  {e === "vm" ? "VM" : "WALLET"}
                </button>
              );
            })}
          </div>
          <DigPrimaryButton
            theme={theme}
            label={busy ? "…" : "DEPLOY"}
            onClick={() => void deploy()}
            disabled={busy}
            testId="dig-deploy-cta"
          />
          {error && (
            <DigEmptyBody theme={theme} message={error} />
          )}
        </div>
      )}
    </DigPanelShell>
  );
}
