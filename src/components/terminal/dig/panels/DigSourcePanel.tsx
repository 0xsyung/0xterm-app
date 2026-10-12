/**
 * @file DigSourcePanel.tsx
 * @description DEV SOURCE dig-new / dig-open / dig-edit panels (#166)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeConfig } from "../../types";
import DigEditorWidget from "../../widgets/DigEditorWidget";
import {
  loadDigArtifacts,
  loadDigSource,
  loadDigSolcVersion,
  saveDigSource
} from "../idb";
import { counterTemplate } from "../templates";
import { DigEmptyBody, DigPanelShell } from "./DigPanelShell";
import { formatRelative } from "../../shareCard";

export type DigSourceMode = "new" | "open" | "edit";

export default function DigSourcePanel({
  theme,
  mode,
  onClose
}: {
  theme: ThemeConfig;
  mode: DigSourceMode;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [filename, setFilename] = useState("Counter.sol");
  const [content, setContent] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "open">("edit");
  const [dirty, setDirty] = useState(false);
  const [compiledAtSec, setCompiledAtSec] = useState<number | null>(null);
  const [hasArtifact, setHasArtifact] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const arts = await loadDigArtifacts();
      if (!cancelled) {
        setHasArtifact(arts.length > 0);
        // No persisted compile timestamp — treat presence as compiled (no relative).
        setCompiledAtSec(arts.length > 0 ? Math.floor(Date.now() / 1000) : null);
      }

      if (mode === "new") {
        const ver = await loadDigSolcVersion();
        const tpl = counterTemplate("Counter", ver);
        await saveDigSource(tpl.filename, tpl.content);
        if (cancelled) return;
        setFilename(tpl.filename);
        setContent(tpl.content);
        setEditorMode("edit");
        setDirty(false);
        setEmpty(false);
        setReady(true);
        return;
      }

      if (mode === "open") {
        // Soft ACK: OPEN always starts on Choose .sol file — do not preload
        // the live IDB buffer into the editor (avoids skip-picker feel).
        if (cancelled) return;
        setFilename("Contract.sol");
        setContent("");
        setEditorMode("open");
        setDirty(false);
        setEmpty(false);
        setReady(true);
        return;
      }

      // edit
      const existing = await loadDigSource();
      if (cancelled) return;
      if (!existing || !existing.content.trim()) {
        setEmpty(true);
        setReady(true);
        return;
      }
      setFilename(existing.filename);
      setContent(existing.content);
      setEditorMode("edit");
      setDirty(false);
      setEmpty(false);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const onChange = useCallback((fn: string, body: string) => {
    setFilename(fn);
    setContent(body);
    setDirty(true);
    // Auto-save settles → Soft ACK "saved" after next tick of persist (DigEditor already saves).
    window.setTimeout(() => setDirty(false), 400);
  }, []);

  const dirtyLabel = dirty ? "● unsaved" : "saved";
  const compiledLabel =
    hasArtifact || compiledAtSec != null
      ? compiledAtSec != null
        ? `compiled ${formatRelative(compiledAtSec) || "just now"}`
        : "compiled"
      : "not compiled";

  const title =
    mode === "new" ? "NEW" : mode === "open" ? "OPEN" : "EDIT";

  if (!ready) {
    return (
      <DigPanelShell theme={theme} title={title} onClose={onClose} testId={`dig-source-${mode}`}>
        <div className={`text-[10px] ${theme.muted}`}>…</div>
      </DigPanelShell>
    );
  }

  if (empty) {
    return (
      <DigPanelShell theme={theme} title={title} onClose={onClose} testId={`dig-source-${mode}`}>
        <DigEmptyBody
          theme={theme}
          message="No saved source. NEW or OPEN a .sol file."
        />
      </DigPanelShell>
    );
  }

  return (
    <DigPanelShell
      theme={theme}
      title="SOURCE"
      subtitle={
        <>
          <span className={theme.text}>{filename}</span>
          <span> · {dirtyLabel}</span>
          <span> · {compiledLabel}</span>
        </>
      }
      onClose={onClose}
      testId={`dig-source-${mode}`}
    >
      <DigEditorWidget
        theme={theme}
        filename={filename}
        initialContent={content}
        mode={editorMode}
        embedded
        dirtyLabel={dirtyLabel}
        compiledLabel={compiledLabel}
        onClose={onClose}
        onChange={onChange}
      />
    </DigPanelShell>
  );
}
