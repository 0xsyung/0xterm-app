/**
 * @file DigSessionPanel.tsx
 * @description DEV SHIP SESSION — dig-ls list chrome (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../../types";
import { envLabel, listDigDeployments } from "../session";
import { truncateAddress } from "../encode";
import { DigEmptyBody, DigPanelShell, DIG_PANEL_TOUCH } from "./DigPanelShell";

export default function DigSessionPanel({
  theme,
  onClose,
  onFillPrompt
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onFillPrompt?: (text: string) => void;
}) {
  const rows = listDigDeployments();

  return (
    <DigPanelShell theme={theme} title="SESSION" onClose={onClose} testId="dig-session-panel">
      {rows.length === 0 ? (
        <DigEmptyBody theme={theme} message="No deploys this session." />
      ) : (
        <div className={`text-[10px] space-y-1 ${theme.text}`} data-testid="dig-session-rows">
          {rows.map((row) => (
            <button
              key={row.address}
              type="button"
              className={`block w-full text-left tabular-nums ${DIG_PANEL_TOUCH}`}
              onClick={() => onFillPrompt?.(`dig at ${row.address} `)}
            >
              <span className="font-bold">{row.name}</span>{" "}
              <span className="font-mono">{truncateAddress(row.address)}</span>{" "}
              <span className={theme.muted}>
                {envLabel(row.env, row.chainName)}
              </span>
            </button>
          ))}
        </div>
      )}
    </DigPanelShell>
  );
}
