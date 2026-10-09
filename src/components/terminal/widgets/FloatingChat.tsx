/**
 * @file FloatingChat.tsx
 * @description LinkedIn-style floating messenger bubble + overlay (#82/#140). Skins-only.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import type { ThemeConfig } from "../types";
import type { PrimaryTab } from "../socialUnread";
import { formatBadgeCount } from "../socialUnread";
import {
  ChannelSwitcher,
  InboxThreadList,
  InboxThreadMessages,
  NewConversationForm,
  type InboxSenderSummary,
  type InboxThreadView
} from "../inbox/InboxViews";
import type { WorkspacePanelId } from "../workspaces/WorkspaceTile";
import type { ChatChannel, ChannelId } from "../chatChannels";
import {
  FLOATING_CHAT_MD_MIN_PX,
  computeFloatingChatPanelLayout,
  fallbackTopChromeHeight
} from "./floatingChatLayout";

function errMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

export type FloatingChatProps = {
  theme: ThemeConfig;
  /** Prefer theme.rounded only when soft (macintosh); else 0-radius per Stephy. */
  themeKey?: string;
  inboxUnread: number;
  channelLabel: string | null;
  isConnected: boolean;
  /** Pixels from shell bottom to clear above prompt (≥12px gap applied here). */
  promptClearancePx: number;
  primaryTab: PrimaryTab;
  /** Open tool panel id — collapse expanded chat when a large panel opens (#140 A3). */
  openPanel?: WorkspacePanelId | null;
  loadSenders: () => Promise<InboxSenderSummary[]>;
  loadThread: (peer: Address) => Promise<InboxThreadView>;
  /** Advance/clear inbox baseline (same as opening Social Inbox). */
  onAckInbox: () => void;
  /** Notify shell so poller keeps badge clear while open. */
  onOpenChange?: (open: boolean) => void;
  sendMessage?: (peer: Address, text: string) => Promise<void>;
  /** NEW conversation — resolve + send via existing chat path; returns peer Address. */
  startConversation?: (peer: string, message: string) => Promise<Address>;
  onFocusPrompt?: () => void;
  /** Known channels for the switcher dropdown (#58). */
  channels?: ChatChannel[];
  /** Active channel id (matches `channels`), or null. */
  activeChannelId?: ChannelId | null;
  /** User picked a different channel in the dropdown. */
  onSwitchChannel?: (channel: ChatChannel) => void;
};

const BUBBLE = 48;
const GAP = 12;

/** Large panels that should collapse expanded CHAT when opened (#140 A3). */
const LARGE_PANELS: ReadonlySet<WorkspacePanelId> = new Set([
  "news",
  "price",
  "swap",
  "sim",
  "trace"
]);

export default function FloatingChat({
  theme,
  themeKey,
  inboxUnread,
  channelLabel,
  isConnected,
  promptClearancePx,
  primaryTab,
  openPanel = null,
  loadSenders,
  loadThread,
  onAckInbox,
  onOpenChange,
  sendMessage,
  startConversation,
  onFocusPrompt,
  channels,
  activeChannelId,
  onSwitchChannel
}: FloatingChatProps) {
  const [open, setOpen] = useState(false);
  const [senders, setSenders] = useState<InboxSenderSummary[] | null>(null);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [thread, setThread] = useState<InboxThreadView | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevTabRef = useRef(primaryTab);
  const prevPanelRef = useRef(openPanel);
  // Latest loader in a ref so the open-effect below stays stable across parent
  // re-renders (otherwise inline loader props retrigger fetch every render).
  const loadSendersRef = useRef(loadSenders);
  useEffect(() => {
    loadSendersRef.current = loadSenders;
  }, [loadSenders]);

  const radius =
    themeKey === "macintosh" || (theme.rounded && theme.rounded !== "rounded-none")
      ? theme.rounded || "rounded-none"
      : "rounded-none";

  const badgeLabel = formatBadgeCount(inboxUnread);
  const bubbleBottom = Math.max(GAP, promptClearancePx + GAP);
  const rightPx = 12;
  // Panel bottom shares bubble clearance (≥12px above prompt). Bubble hides while open
  // so it does not cover the panel; collapse via × / Esc (or re-show bubble).

  // #185: measure viewport + live top chrome so the panel never runs under the nav/F-row.
  // Default to md-sized so SSR / first paint matches the unchanged ≥768 path.
  const [viewport, setViewport] = useState({
    width: FLOATING_CHAT_MD_MIN_PX,
    height: 768
  });
  const [topChromeHeight, setTopChromeHeight] = useState(() =>
    fallbackTopChromeHeight(FLOATING_CHAT_MD_MIN_PX)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.querySelector("[data-terminal-header]");
    if (!el || typeof ResizeObserver === "undefined") {
      /* eslint-disable react-hooks/set-state-in-effect -- #185 fallback when header unmeasurable */
      setTopChromeHeight(fallbackTopChromeHeight(viewport.width));
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    const apply = () => {
      setTopChromeHeight(Math.ceil(el.getBoundingClientRect().height));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewport.width]);

  const panelLayout = useMemo(
    () =>
      computeFloatingChatPanelLayout({
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        bubbleBottom,
        topChromeHeight
      }),
    [viewport.width, viewport.height, bubbleBottom, topChromeHeight]
  );

  const setExpanded = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
      if (next) {
        onAckInbox();
      } else if (primaryTab === "terminal") {
        onFocusPrompt?.();
      }
    },
    [onAckInbox, onFocusPrompt, onOpenChange, primaryTab]
  );

  // A3: leaving SOCIAL → collapse expanded CHAT to bubble.
  // #182: entering SETTINGS → collapse so channel REMOVE isn't covered by the panel.
  useEffect(() => {
    const prev = prevTabRef.current;
    prevTabRef.current = primaryTab;
    if (!open) return;
    if (prev === "social" && primaryTab !== "social") {
      setExpanded(false);
      return;
    }
    if (primaryTab === "settings" && prev !== "settings") {
      setExpanded(false);
    }
  }, [primaryTab, open, setExpanded]);

  // A3: opening NEWS / Price / Swap / Sim / Trace → collapse CHAT if expanded.
  useEffect(() => {
    const prev = prevPanelRef.current;
    prevPanelRef.current = openPanel;
    if (
      openPanel &&
      openPanel !== prev &&
      LARGE_PANELS.has(openPanel) &&
      open
    ) {
      setExpanded(false);
    }
  }, [openPanel, open, setExpanded]);

  const refreshSenders = useCallback(async () => {
    setInboxLoading(true);
    setInboxError(null);
    try {
      const list = await loadSendersRef.current();
      setSenders(list);
    } catch (err: unknown) {
      setInboxError(errMessage(err, "Failed to load inbox."));
      setSenders([]);
    } finally {
      setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- open-driven fetch */
    setThread(null);
    void refreshSenders();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, refreshSenders, channelLabel, activeChannelId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const root = panelRef.current;
      if (!root) return;
      const active = document.activeElement;
      if (active && root.contains(active)) {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setExpanded]);

  // Autofocus panel root when opened so Esc works without requiring a click first.
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  const openThread = async (peer: Address) => {
    setThreadLoading(true);
    setInboxError(null);
    try {
      const t = await loadThread(peer);
      setThread(t);
    } catch (err: unknown) {
      setInboxError(errMessage(err, "Failed to load thread."));
      setThread(null);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!thread || !sendMessage) return;
    setSending(true);
    try {
      await sendMessage(thread.peer, text);
      const t = await loadThread(thread.peer);
      setThread(t);
      void refreshSenders();
    } finally {
      setSending(false);
    }
  };

  const handleStart = async (peerInput: string, message: string) => {
    if (!startConversation) throw new Error("Send unavailable.");
    const addr = await startConversation(peerInput, message);
    void refreshSenders();
    await openThread(addr);
    return addr;
  };

  const canCompose = isConnected && !!channelLabel && !!startConversation;

  // #183: never wider than the viewport (minus margins) — sub-296px viewports
  // used to clip the panel because the 280px floor beat the 100vw cap.
  // #185: on narrow viewports, height is capped to space under the top chrome.
  const panelStyle: React.CSSProperties = {
    bottom: panelLayout.bottom,
    right: panelLayout.right,
    width: panelLayout.width,
    height: panelLayout.height,
    minWidth: panelLayout.minWidth,
    minHeight: panelLayout.minHeight,
    maxWidth: panelLayout.maxWidth,
    maxHeight: panelLayout.maxHeight,
    ...(panelLayout.top !== undefined ? { top: panelLayout.top } : {}),
    ...(panelLayout.left !== undefined ? { left: panelLayout.left } : {})
  };

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Floating chat"
          data-retain-focus=""
          data-floating-chat-panel=""
          data-floating-chat-layout={panelLayout.mode}
          tabIndex={-1}
          className={`absolute z-[25] flex flex-col border ${theme.border} ${theme.cardBg} ${radius} text-xs shadow-xl overflow-hidden outline-none`}
          style={panelStyle}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${theme.border} shrink-0`}
          >
            {/* #172: always-on channel dropdown replaces the static `· <channel>` suffix. */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`font-bold uppercase tracking-widest text-[11px] ${theme.primary} shrink-0`}
              >
                CHAT
              </span>
              <ChannelSwitcher
                theme={theme}
                channels={channels ?? []}
                activeId={activeChannelId ?? null}
                onSwitch={onSwitchChannel ?? (() => {})}
                radius={radius}
                hideLabel
                placeholder={channelLabel || "No active channel"}
                className="flex-1"
              />
            </div>
            <button
              type="button"
              aria-label="Collapse chat"
              onClick={() => setExpanded(false)}
              className={`inline-flex items-center justify-center w-8 h-8 pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] [@media(hover:none)]:min-h-[44px] [@media(hover:none)]:min-w-[44px] border ${theme.border} ${theme.muted} cursor-pointer ${radius}`}
            >
              ×
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col text-[11px] md:text-xs space-y-2">
            {!isConnected && (
              <div className={theme.muted}>Connect a wallet to read chat.</div>
            )}
            {/* #183: header placeholder already says "No active channel"; the body
                only nudges toward the dropdown when there is something to pick. */}
            {isConnected && !channelLabel && (channels?.length ?? 0) > 0 && (
              <div className={theme.muted}>Pick a channel above.</div>
            )}
            {isConnected &&
              channelLabel &&
              inboxLoading &&
              !senders &&
              !thread && <div className={theme.muted}>Loading…</div>}
            {inboxError && <div className={theme.muted}>{inboxError}</div>}
            {isConnected &&
              channelLabel &&
              senders &&
              senders.length === 0 &&
              !thread &&
              !threadLoading && (
                <div className="space-y-2">
                  <div className={theme.muted}>No conversations</div>
                  {canCompose && (
                    <NewConversationForm
                      theme={theme}
                      onStart={handleStart}
                      defaultOpen
                      radius={radius}
                    />
                  )}
                </div>
              )}
            {isConnected &&
              channelLabel &&
              senders &&
              senders.length > 0 &&
              !thread &&
              !threadLoading && (
                <div className="space-y-2 overflow-y-auto min-h-0 flex-1">
                  {canCompose && (
                    <NewConversationForm
                      theme={theme}
                      onStart={handleStart}
                      defaultOpen={false}
                      radius={radius}
                    />
                  )}
                  <InboxThreadList
                    theme={theme}
                    senders={senders}
                    onOpenThread={(peer) => void openThread(peer)}
                    emptyLabel="No conversations"
                    radius={radius}
                  />
                </div>
              )}
            {threadLoading && <div className={theme.muted}>Decrypting…</div>}
            {thread && (
              <InboxThreadMessages
                theme={theme}
                thread={thread}
                onBack={() => setThread(null)}
                emptyLabel="No messages yet"
                onSend={sendMessage ? (t) => handleSend(t) : undefined}
                sending={sending}
              />
            )}
          </div>
        </div>
      )}

      {/* Bubble: mouse/tap only — no data-retain-focus (must not steal prompt).
          Hidden while expanded so panel owns the corner; × / Esc collapse. */}
      {!open && (
        <button
          type="button"
          data-floating-chat-bubble=""
          aria-label={
            badgeLabel
              ? `Open chat, ${badgeLabel} unread`
              : "Open chat"
          }
          aria-expanded={false}
          onClick={() => setExpanded(true)}
          className={`absolute z-[20] inline-flex items-center justify-center border ${theme.border} ${theme.cardBg} cursor-pointer pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] [@media(hover:none)]:min-h-[44px] [@media(hover:none)]:min-w-[44px] ${radius} [@media(hover:hover)]:hover:[border-color:var(--phosphor)]`}
          style={{
            bottom: bubbleBottom,
            right: rightPx,
            width: BUBBLE,
            height: BUBBLE
          }}
        >
          <span
            className={`text-[9px] uppercase tracking-widest font-bold ${theme.muted}`}
          >
            CHAT
          </span>
          {badgeLabel && (
            <span
              className={`absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[9px] leading-none font-bold ${radius}`}
              style={{
                background: theme.phosphor,
                color: "#000000"
              }}
              aria-hidden
            >
              {badgeLabel}
            </span>
          )}
        </button>
      )}
    </>
  );
}
