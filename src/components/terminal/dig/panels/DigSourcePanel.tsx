/**
 * @file DigSourcePanel.tsx
 * @description DEV SOURCE unified EDITOR — dig-source (#198 Soft ACK)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { ThemeConfig } from "../../types";
import DigEditorWidget from "../../widgets/DigEditorWidget";
import {
  loadDigArtifacts,
  loadDigSource,
  loadDigSourceRecents,
  loadDigSolcVersion,
  saveDigSource,
  type DigSourceRecent
} from "../idb";
import { counterTemplate } from "../templates";
import {
  DigEmptyBody,
  DigPanelShell,
  DigPrimaryButton,
  DIG_PANEL_TOUCH
} from "./DigPanelShell";
import { formatRelative } from "../../shareCard";

type Phase = "edit" | "pick";
type ConfirmKind = "new" | "discard" | null;

const AUTOSAVE_MS = 400;

export default function DigSourcePanel({
  theme,
  onClose
}: {
  theme: ThemeConfig;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [filename, setFilename] = useState("Counter.sol");
  const [content, setContent] = useState("");
  const [lastIdb, setLastIdb] = useState<{ filename: string; content: string } | null>(
    null
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("edit");
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [pendingLoad, setPendingLoad] = useState<{
    filename: string;
    content: string;
  } | null>(null);
  const [recents, setRecents] = useState<DigSourceRecent[]>([]);
  const [hasArtifact, setHasArtifact] = useState(false);
  const [compiledAtSec, setCompiledAtSec] = useState<number | null>(null);
  const [downloadAck, setDownloadAck] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"NEW" | "OPEN" | "SAVE AS" | null>(
    null
  );
  const [bufferKey, setBufferKey] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  const filenameRef = useRef(filename);
  contentRef.current = content;
  filenameRef.current = filename;

  const flushIdb = useCallback(async (fn: string, body: string) => {
    setSaving(true);
    setSaveError(null);
    try {
      const ok = await saveDigSource(fn, body);
      if (ok) {
        setLastIdb({ filename: fn, content: body });
        setDirty(false);
        const next = await loadDigSourceRecents();
        setRecents(next);
      } else {
        // Soft ACK honesty — never claim saved · idb on failed write
        setSaveError("IDB save failed");
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "IDB save failed");
    } finally {
      setSaving(false);
    }
  }, []);

  // Mount: restore last IDB — never Counter on remount (#198).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [existing, arts, recent] = await Promise.all([
        loadDigSource(),
        loadDigArtifacts(),
        loadDigSourceRecents()
      ]);
      if (cancelled) return;
      setHasArtifact(arts.length > 0);
      setCompiledAtSec(arts.length > 0 ? Math.floor(Date.now() / 1000) : null);
      setRecents(recent);
      if (existing && existing.content.trim()) {
        setFilename(existing.filename);
        setContent(existing.content);
        setLastIdb({ filename: existing.filename, content: existing.content });
        setDirty(false);
        setSaveError(null);
        setPhase("edit");
        setBufferKey((k) => k + 1);
      } else {
        setFilename("Counter.sol");
        setContent("");
        setLastIdb(null);
        setDirty(false);
        setPhase("edit");
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  const scheduleAutosave = useCallback(
    (fn: string, body: string) => {
      setDirty(true);
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        void flushIdb(fn, body);
      }, AUTOSAVE_MS);
    },
    [flushIdb]
  );

  const applyBuffer = useCallback(
    async (fn: string, body: string, opts?: { skipAutosave?: boolean }) => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      setFilename(fn);
      setContent(body);
      setBufferKey((k) => k + 1);
      setPhase("edit");
      setConfirm(null);
      setPendingLoad(null);
      setActiveAction(null);
      if (opts?.skipAutosave) {
        setLastIdb({ filename: fn, content: body });
        setDirty(false);
        return;
      }
      await flushIdb(fn, body);
    },
    [flushIdb]
  );

  const idbNonEmpty = !!(lastIdb && lastIdb.content.trim());
  const needsConfirm =
    dirty || idbNonEmpty || (content.trim().length > 0 && phase === "edit");

  const requestNew = () => {
    setActiveAction("NEW");
    if (needsConfirm && (dirty || content.trim() || idbNonEmpty)) {
      setConfirm("new");
      return;
    }
    void doNew();
  };

  const doNew = async () => {
    const ver = await loadDigSolcVersion();
    const tpl = counterTemplate("Counter", ver);
    await applyBuffer(tpl.filename, tpl.content);
    setActiveAction(null);
  };

  const requestOpen = () => {
    setActiveAction("OPEN");
    if (dirty) {
      setConfirm("discard");
      setPendingLoad(null); // open picker after discard
      return;
    }
    setPhase("pick");
  };

  const afterDiscardForOpen = () => {
    setConfirm(null);
    setDirty(false);
    setPhase("pick");
    setActiveAction("OPEN");
  };

  const onPickFile = async (file: File | null) => {
    if (!file) {
      setPhase("edit");
      setActiveAction(null);
      return;
    }
    const text = await file.text();
    const fn = file.name.endsWith(".sol") ? file.name : `${file.name}.sol`;
    await applyBuffer(fn, text);
  };

  const requestRecent = (r: DigSourceRecent) => {
    if (dirty) {
      setConfirm("discard");
      setPendingLoad({ filename: r.filename, content: r.content });
      setActiveAction(null);
      return;
    }
    void applyBuffer(r.filename, r.content);
  };

  const afterDiscardLoad = () => {
    const p = pendingLoad;
    setConfirm(null);
    setPendingLoad(null);
    if (p) {
      void applyBuffer(p.filename, p.content);
      return;
    }
    // discard was for OPEN
    afterDiscardForOpen();
  };

  const saveAs = async () => {
    setActiveAction("SAVE AS");
    const fn = filenameRef.current.endsWith(".sol")
      ? filenameRef.current
      : `${filenameRef.current}.sol`;
    const body = contentRef.current;
    try {
      const w = window as Window & {
        showSaveFilePicker?: (opts: {
          suggestedName?: string;
          types?: Array<{
            description: string;
            accept: Record<string, string[]>;
          }>;
        }) => Promise<FileSystemFileHandle>;
      };
      if (typeof w.showSaveFilePicker === "function") {
        try {
          const handle = await w.showSaveFilePicker({
            suggestedName: fn,
            types: [
              {
                description: "Solidity",
                accept: { "text/plain": [".sol"] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(body);
          await writable.close();
          setDownloadAck(`[✓] Downloaded ${fn}.`);
          setTimeout(() => setDownloadAck(null), 2000);
          setActiveAction(null);
          return;
        } catch {
          // Cancel / AbortError / deny / other picker failures — no <a download>,
          // no success ack (#228 Soft ACK). Clear via finally.
          return;
        }
      }
      // <a download> only when showSaveFilePicker is unavailable (#228)
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fn;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadAck(`[✓] Downloaded ${fn}.`);
      setTimeout(() => setDownloadAck(null), 2000);
    } finally {
      setActiveAction(null);
    }
  };

  const onEditorChange = useCallback(
    (fn: string, body: string) => {
      filenameRef.current = fn;
      contentRef.current = body;
      setFilename(fn);
      // Keep parent content for empty-check / SAVE AS, but DigEditor owns caret
      // via bufferKey — do not bump bufferKey here.
      setContent(body);
      scheduleAutosave(fn, body);
    },
    [scheduleAutosave]
  );

  const statusDirty =
    saving
      ? "saving…"
      : saveError
        ? `save failed · ${saveError}`
        : dirty
          ? "● unsaved"
          : lastIdb
            ? "saved · idb"
            : "idle";
  const statusCompiled =
    hasArtifact || compiledAtSec != null
      ? compiledAtSec != null
        ? `compiled ${formatRelative(compiledAtSec) || "just now"}`
        : "compiled"
      : "not compiled";

  const empty = ready && !content.trim() && phase === "edit" && !confirm;

  const actionBtn = (label: "NEW" | "OPEN" | "SAVE AS", onClick: () => void) => {
    const on = activeAction === label || (label === "OPEN" && phase === "pick");
    return (
      <button
        key={label}
        type="button"
        onClick={onClick}
        className={`uppercase tracking-widest text-[10px] px-2.5 py-1.5 border cursor-pointer ${DIG_PANEL_TOUCH} ${
          on ? "border-transparent font-bold" : `${theme.border} ${theme.muted}`
        }`}
        style={on ? { background: theme.phosphor, color: "#000000" } : undefined}
        data-testid={`dig-source-action-${label.toLowerCase().replace(" ", "-")}`}
      >
        {label}
      </button>
    );
  };

  const confirmUi = (message: string, okLabel: string, onOk: () => void): ReactNode => (
    <div
      className={`flex flex-col gap-3 p-3 border ${theme.border}`}
      data-testid="dig-source-confirm"
      role="alertdialog"
    >
      <div className={`text-[10px] md:text-[11px] ${theme.text}`}>{message}</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`uppercase tracking-widest text-[10px] px-3 py-1.5 border border-transparent font-bold cursor-pointer ${DIG_PANEL_TOUCH}`}
          style={{ background: theme.phosphor, color: "#000000" }}
          onClick={onOk}
          data-testid="dig-source-confirm-ok"
        >
          {okLabel}
        </button>
        <button
          type="button"
          className={`uppercase tracking-widest text-[10px] px-3 py-1.5 border ${theme.border} ${theme.muted} cursor-pointer ${DIG_PANEL_TOUCH}`}
          onClick={() => {
            setConfirm(null);
            setPendingLoad(null);
            setActiveAction(null);
            if (phase === "pick") setPhase("edit");
          }}
          data-testid="dig-source-confirm-cancel"
        >
          CANCEL
        </button>
      </div>
    </div>
  );

  if (!ready) {
    return (
      <DigPanelShell theme={theme} title="SOURCE" onClose={onClose} testId="dig-source-panel">
        <div className={`text-[10px] ${theme.muted}`}>…</div>
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
          <span> · {statusDirty}</span>
          <span> · {statusCompiled}</span>
        </>
      }
      onClose={onClose}
      testId="dig-source-panel"
    >
      <div className="flex flex-wrap gap-1.5" data-testid="dig-source-actions">
        {actionBtn("NEW", requestNew)}
        {actionBtn("OPEN", requestOpen)}
        {actionBtn("SAVE AS", () => void saveAs())}
      </div>

      {recents.length > 0 && phase === "edit" && !confirm && (
        <div
          className={`text-[10px] flex flex-wrap items-center gap-x-2 gap-y-1 ${theme.muted}`}
          data-testid="dig-source-recents"
        >
          <span className="uppercase tracking-widest">RECENT</span>
          {recents.map((r) => (
            <button
              key={`${r.filename}-${r.updatedAt}`}
              type="button"
              className={`font-mono cursor-pointer underline-offset-2 hover:underline ${theme.text} ${DIG_PANEL_TOUCH}`}
              onClick={() => requestRecent(r)}
            >
              {r.filename}
            </button>
          ))}
        </div>
      )}

      {confirm === "new" &&
        confirmUi("Replace buffer with Counter template?", "REPLACE", () => {
          void doNew();
        })}
      {confirm === "discard" &&
        confirmUi("Discard unsaved changes?", "DISCARD", afterDiscardLoad)}

      {phase === "pick" && !confirm && (
        <div className="flex flex-col gap-2" data-testid="dig-source-open-phase">
          <DigPrimaryButton
            theme={theme}
            label="Choose .sol file"
            onClick={() => fileRef.current?.click()}
            testId="dig-source-choose"
          />
          <input
            ref={fileRef}
            type="file"
            accept=".sol,text/plain"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <div className={`text-[10px] ${theme.muted}`}>
            Esc closes · no silent disk read
          </div>
        </div>
      )}

      {phase === "edit" && !confirm && empty && (
        <DigEmptyBody
          theme={theme}
          message="No saved source. NEW or OPEN a .sol file."
        />
      )}

      {phase === "edit" && !confirm && !empty && (
        <DigEditorWidget
          theme={theme}
          filename={filename}
          initialContent={content}
          mode="edit"
          embedded
          ownEscape={false}
          autosave={false}
          bufferKey={bufferKey}
          onChange={onEditorChange}
        />
      )}

      {downloadAck && (
        <div className={`text-[10px] ${theme.primary}`} data-testid="dig-source-download-ack">
          {downloadAck}
        </div>
      )}
    </DigPanelShell>
  );
}
