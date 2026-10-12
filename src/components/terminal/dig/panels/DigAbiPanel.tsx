/**
 * @file DigAbiPanel.tsx
 * @description DEV BUILD ABI panel (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "../../types";
import DigAbiWidget from "../../widgets/DigAbiWidget";
import type { DigContractArtifact } from "../artifact";
import { loadDigArtifacts } from "../idb";
import { DigEmptyBody, DigPanelShell } from "./DigPanelShell";

export default function DigAbiPanel({
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

  return (
    <DigPanelShell theme={theme} title="ABI" onClose={onClose} testId="dig-abi-panel">
      {!artifact ? (
        <DigEmptyBody theme={theme} message="No artifact. Compile source first." />
      ) : (
        <DigAbiWidget name={artifact.name} abi={artifact.abi} theme={theme} />
      )}
    </DigPanelShell>
  );
}
