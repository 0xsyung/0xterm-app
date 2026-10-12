/**
 * @file DigEditorWidget.tsx
 * @description Dig Solidity source editor — textarea + line gutter (#39)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ThemeConfig } from "../types";
import { saveDigSource } from "../dig/idb";

export default function DigEditorWidget({
  theme,
  filename,
  initialContent,
  mode = "edit",
  onClose,
  onChange,
  /** Drop outer card chrome — parent DigSourcePanel owns Soft ACK header (#166). */
  embedded = false,
  /** Soft ACK status: `● unsaved` / `saved`. */
  dirtyLabel,
  /** Soft ACK status: `compiled {relative}` / `not compiled`. */
  compiledLabel,
  /** When false, parent DigPanelShell owns Esc (#198). Default true. */
  ownEscape = true,
  /** When false, parent owns IDB autosave; onChange only (#198). Default true. */
  autosave = true,
  /**
   * When set, reseed name/content only when this key changes (unified EDITOR
   * parent must not push every keystroke via initialContent — #198).
   */
  bufferKey
}: {
  theme: ThemeConfig;
  filename: string;
  initialContent: string;
  /** edit = textarea; open = file picker first */
  mode?: "edit" | "open";
  onClose?: () => void;
  onChange?: (filename: string, content: string) => void;
  embedded?: boolean;
  dirtyLabel?: string;
  compiledLabel?: string;
  ownEscape?: boolean;
  autosave?: boolean;
  bufferKey?: string | number;
}) {
  const [name, setName] = useState(filename);
  const [content, setContent] = useState(initialContent);
  const [phase, setPhase] = useState<"edit" | "pick">(
    mode === "open" ? "pick" : "edit"
  );
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    const n = content.split("\n").length;
    return Array.from({ length: Math.max(n, 1) }, (_, i) => i + 1);
  }, [content]);

  // Console / legacy: follow filename+initialContent.
  useEffect(() => {
    if (bufferKey !== undefined) return;
    setName(filename);
    setContent(initialContent);
  }, [filename, initialContent, bufferKey]);

  // Unified EDITOR (#198): reseed only when parent bumps bufferKey (NEW/OPEN/RECENT).
  useEffect(() => {
    if (bufferKey === undefined) return;
    setName(filename);
    setContent(initialContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bufferKey is the reseed signal
  }, [bufferKey]);

  // OPEN Soft ACK: always land on Choose .sol file (don't keep edit phase if mode flips).
  useEffect(() => {
    setPhase(mode === "open" ? "pick" : "edit");
  }, [mode]);

  useEffect(() => {
    if (!ownEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, ownEscape]);

  const persist = useCallback(
    (fn: string, body: string) => {
      if (autosave) void saveDigSource(fn, body);
      onChange?.(fn, body);
    },
    [onChange, autosave]
  );

  const onInput = (v: string) => {
    setContent(v);
    persist(name, v);
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const fn = file.name.endsWith(".sol") ? file.name : `${file.name}.sol`;
    setName(fn);
    setContent(text);
    persist(fn, text);
    setPhase("edit");
  };

  /** Keep gutter line numbers aligned while the textarea scrolls (#98). */
  const onTaScroll = () => {
    if (gutterRef.current && taRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  if (phase === "pick") {
    return (
      <div
        data-retain-focus=""
        className={
          embedded
            ? `relative w-full ${theme.text}`
            : `relative my-3 mb-3 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} max-w-2xl ${theme.text}`
        }
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {!embedded && (
          <div
            className={`border-b ${theme.border} pb-1 mb-2 text-[10px] tracking-wider flex gap-2`}
          >
            <span className={theme.muted}>SOURCE</span>
            <span className={theme.text}>open .sol</span>
          </div>
        )}
        <button
          type="button"
          className={`uppercase text-[10px] px-3 border ${theme.border} ${theme.primary} cursor-pointer min-h-[44px] min-w-[44px] pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] w-full max-md:min-h-[44px]`}
          style={
            embedded
              ? { background: theme.phosphor, color: "#000000", borderColor: "transparent" }
              : undefined
          }
          onClick={() => fileRef.current?.click()}
        >
          Choose .sol file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".sol,text/plain"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
        />
        <div className={`mt-2 text-[10px] ${theme.muted}`}>
          Esc closes · no silent disk read
        </div>
      </div>
    );
  }

  // #92: flex column with min-h-0 + internal scroll; mb-3 (≥12px) clears
  // status/prompt chrome so the bottom gutter/source lines are not clipped.
  const statusBits = [dirtyLabel, compiledLabel].filter(Boolean);

  return (
    <div
      data-dig-editor
      data-retain-focus=""
      className={
        embedded
          ? `relative w-full min-h-0 flex flex-col overflow-hidden max-h-[min(50vh,calc(100dvh-14rem))] border ${theme.border}`
          : `relative my-3 mb-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} max-w-2xl w-full min-h-0 flex flex-col overflow-hidden max-h-[min(50vh,calc(100dvh-14rem))]`
      }
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {!embedded && (
      <div
        className={`shrink-0 border-b ${theme.border} px-2 py-1 text-[10px] tracking-wider flex gap-2 items-center flex-wrap`}
      >
        <span className={theme.muted}>SOURCE</span>
        <span className={theme.text}>{name}</span>
        {statusBits.map((s) => (
          <span key={s} className={theme.muted}>
            · {s}
          </span>
        ))}
        <button
          type="button"
          title="Close"
          className={`ml-auto uppercase text-[10px] cursor-pointer ${theme.primary} min-h-[44px] min-w-[44px] flex items-center justify-center`}
          onClick={() => onClose?.()}
        >
          Esc
        </button>
      </div>
      )}
      <div
        className="flex flex-1 min-h-0 overflow-hidden"
        style={{ minHeight: "12rem" }}
      >
        {/* #98: overflow-y-auto so scrollTop moves; scrollbar hidden (textarea owns chrome).
            Match textarea text size + leading + vertical pad for 1:1 line align on non-wrapped rows.
            Source may wrap (overflowWrap); gutter rows stay single-line — wrap misalign is accepted. */}
        <div
          ref={gutterRef}
          data-dig-gutter
          className={`select-none text-right pr-2 pl-2 py-2 ${theme.muted} tabular-nums font-mono text-[16px] md:text-[12px] leading-[1.4] overflow-y-auto overflow-x-hidden min-h-0 shrink-0 border-r ${theme.border} [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
          aria-hidden
        >
          {lines.map((n) => (
            <div key={n} className="whitespace-nowrap">
              {n}
            </div>
          ))}
        </div>
        <textarea
          ref={taRef}
          value={content}
          spellCheck={false}
          onChange={(e) => onInput(e.target.value)}
          onScroll={onTaScroll}
          className={`flex-1 min-w-0 min-h-0 resize-none overflow-y-auto bg-transparent outline-none p-2 leading-[1.4] ${theme.text} text-[16px] md:text-[12px] font-mono`}
          style={{ overflowWrap: "anywhere" }}
          aria-label={`Source ${name}`}
        />
      </div>
    </div>
  );
}
