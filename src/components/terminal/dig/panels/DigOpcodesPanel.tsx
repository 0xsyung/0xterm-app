/**
 * @file DigOpcodesPanel.tsx
 * @description DEV BUILD OPCODES panel (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "../../types";
import DigOpcodesWidget from "../../widgets/DigOpcodesWidget";
import type { DigContractArtifact } from "../artifact";
import { loadDigArtifacts } from "../idb";
import { OPCODE_DEFAULT_MAX_ROWS, rowsFromArtifact } from "../opcodes";
import { DigEmptyBody, DigPanelShell } from "./DigPanelShell";

export default function DigOpcodesPanel({
  theme,
  onClose
}: {
  theme: ThemeConfig;
  onClose: () => void;
}) {
  const [artifact, setArtifact] = useState<DigContractArtifact | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadDigArtifacts().then((arts) => {
      if (!cancelled) setArtifact(arts[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!artifact) {
    return (
      <DigPanelShell theme={theme} title="OPCODES" onClose={onClose} testId="dig-opcodes-panel">
        <DigEmptyBody theme={theme} message="No artifact. Compile source first." />
      </DigPanelShell>
    );
  }

  const allRows = rowsFromArtifact(artifact.opcodes, artifact.runtimeBytecode);
  const truncated = allRows.length > OPCODE_DEFAULT_MAX_ROWS;
  const rows = truncated ? allRows.slice(0, OPCODE_DEFAULT_MAX_ROWS) : allRows;

  return (
    <DigPanelShell theme={theme} title="OPCODES" onClose={onClose} testId="dig-opcodes-panel">
      <DigOpcodesWidget
        name={artifact.name}
        rows={rows}
        truncated={truncated}
        theme={theme}
      />
    </DigPanelShell>
  );
}
