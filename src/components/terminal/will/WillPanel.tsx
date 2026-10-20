/**
 * @file WillPanel.tsx
 * @description INVEST WorkspaceFrame WILL panel — Soft ACK #247/#249/#251
 * Thin shell: embeds WillStatusWidget; writes via CLI → WillActionWidget.
 * #249: silent ≤1/10s status poll; no header × (Escape + tile switch).
 * #251: strip header REFRESH (silent poll covers refresh).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThemeConfig } from "../types";
import { INVEST_PANEL_CHAT_GUTTER_CLASS } from "../widgets/floatingChatLayout";
import WillStatusWidget, {
  type WillStatusPayload
} from "../widgets/WillStatusWidget";
import type { FetchWillStatusResult } from "./runWill";

const TOUCH =
  "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

/** Background status poll while panel mounted + document visible (#249). */
export const WILL_STATUS_POLL_MS = 10_000;

export type WillPanelFetchResult = FetchWillStatusResult;

/** Pure helpers — panel action → CLI command (WillActionWidget confirms). */
export function willHeartbeatCmd(): string {
  return "will heartbeat";
}
export function willCancelCmd(): string {
  return "will cancel";
}
export function willClaimCmd(): string {
  return "will claim";
}
export function willSetCmd(heir: string, delay: string): string | null {
  const h = heir.trim();
  if (!h) return null;
  const d = delay.trim() || "90d";
  return `will set --heir ${h} --delay ${d}`;
}
export function willDepositCmd(token: string, amount: string): string | null {
  const t = token.trim();
  const a = amount.trim();
  if (!t || !a) return null;
  return `will deposit ${t} ${a}`;
}
export function willWithdrawCmd(token: string, amount: string): string | null {
  const t = token.trim();
  const a = amount.trim();
  if (!t || !a) return null;
  return `will withdraw ${t} ${a}`;
}


export default function WillPanel({
  theme,
  onClose,
  onFetch,
  onCommand,
  onPin,
  refreshKey = 0,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onFetch: () => Promise<WillPanelFetchResult>;
  /** Dispatch CLI — confirms land as WillActionWidget in CONSOLE scrollback. */
  onCommand: (cmd: string) => void;
  onPin?: (payload: WillStatusPayload) => void;
  refreshKey?: number;
  frameless?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<WillStatusPayload | null>(null);

  const [heir, setHeir] = useState("");
  const [delay, setDelay] = useState("90d");
  const [depToken, setDepToken] = useState("eth");
  const [depAmount, setDepAmount] = useState("");
  const [wdToken, setWdToken] = useState("eth");
  const [wdAmount, setWdAmount] = useState("");

  // Stabilize onFetch — TerminalShell often passes an inline lambda; keying load
  // on that identity re-fired mount-style busy loads (REFRESH flash) (#249).
  const onFetchRef = useRef(onFetch);
  onFetchRef.current = onFetch;
  const inFlightRef = useRef(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) {
      setRunning(true);
      setError(null);
    }
    try {
      const res = await onFetchRef.current();
      if (res.ok) {
        setPayload(res.data);
        setError(null);
      } else {
        setPayload(null);
        setError(res.error);
      }
    } catch (err: unknown) {
      setPayload(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlightRef.current = false;
      if (!silent) setRunning(false);
    }
  }, []);

  // Mount + intentional refreshKey bumps (CLI / WILL tile re-click) → busy.
  useEffect(() => {
    void load({ silent: false });
  }, [load, refreshKey]);

  // Silent background poll ≤1/10s while visible; pause when document.hidden.
  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void load({ silent: true });
    };
    const id = window.setInterval(tick, WILL_STATUS_POLL_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setCmd = willSetCmd(heir, delay);
  const depCmd = willDepositCmd(depToken, depAmount);
  const wdCmd = willWithdrawCmd(wdToken, wdAmount);

  const field = `w-full bg-transparent border ${theme.border} px-2 py-1.5 text-[11px] font-mono normal-case ${theme.text} ${theme.rounded} ${TOUCH}`;
  const btn = (primary?: boolean) =>
    `cursor-pointer uppercase tracking-widest text-[10px] px-2.5 py-1.5 border ${theme.border} ${TOUCH} ${
      primary
        ? `${theme.primary} ${theme.cardBg}`
        : `${theme.muted} bg-transparent`
    } disabled:opacity-40`;

  return (
    <div
      className={`w-full flex flex-col gap-3 min-h-0 ${INVEST_PANEL_CHAT_GUTTER_CLASS} ${
        frameless
          ? ""
          : `max-w-[420px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="will-panel"
      role="dialog"
      aria-label="Will"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <span
            className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
          >
            WILL
          </span>
          <span className={`text-[10px] ${theme.muted}`}>
            INVEST · inactivity vault
          </span>
        </div>
      </div>

      {error ? (
        <div
          className={`text-[11px] ${theme.warn}`}
          data-testid="will-panel-error"
        >
          {error}
        </div>
      ) : null}

      {payload ? (
        <div data-testid="will-panel-status">
          <WillStatusWidget
            theme={theme}
            payload={payload}
            onPin={
              onPin
                ? () => {
                    onPin(payload);
                  }
                : undefined
            }
          />
        </div>
      ) : !error && running ? (
        <div className={`text-[11px] ${theme.muted}`}>Loading…</div>
      ) : null}

      <div
        className={`flex flex-col gap-2 border-t ${theme.border} pt-2`}
        data-testid="will-panel-actions"
      >
        <div className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>
          Actions → CONSOLE confirm (WillActionWidget)
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={btn(true)}
            data-testid="will-panel-heartbeat"
            onClick={() => onCommand(willHeartbeatCmd())}
          >
            HEARTBEAT
          </button>
          <button
            type="button"
            className={btn()}
            data-testid="will-panel-cancel"
            onClick={() => onCommand(willCancelCmd())}
          >
            CANCEL
          </button>
          <button
            type="button"
            className={btn()}
            data-testid="will-panel-claim"
            onClick={() => onCommand(willClaimCmd())}
          >
            CLAIM
          </button>
        </div>

        <div className="grid gap-1.5">
          <div className={`text-[10px] ${theme.muted}`}>SET heir + delay</div>
          <input
            className={field}
            placeholder="heir 0x… or ens"
            value={heir}
            onChange={(e) => setHeir(e.target.value)}
            data-testid="will-panel-heir"
            spellCheck={false}
          />
          <input
            className={field}
            placeholder="delay (90d)"
            value={delay}
            onChange={(e) => setDelay(e.target.value)}
            data-testid="will-panel-delay"
            spellCheck={false}
          />
          <button
            type="button"
            className={btn(true)}
            disabled={!setCmd}
            data-testid="will-panel-set"
            onClick={() => setCmd && onCommand(setCmd)}
          >
            RUN SET
          </button>
          {setCmd ? (
            <div
              className={`text-[10px] font-mono normal-case tabular-nums ${theme.muted}`}
              data-testid="will-panel-set-preview"
            >
              {setCmd}
            </div>
          ) : null}
        </div>

        <div className="grid gap-1.5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <div className={`text-[10px] ${theme.muted}`}>DEPOSIT</div>
            <input
              className={field}
              placeholder="token|eth"
              value={depToken}
              onChange={(e) => setDepToken(e.target.value)}
              data-testid="will-panel-dep-token"
              spellCheck={false}
            />
            <input
              className={field}
              placeholder="amount"
              value={depAmount}
              onChange={(e) => setDepAmount(e.target.value)}
              data-testid="will-panel-dep-amount"
              spellCheck={false}
            />
            <button
              type="button"
              className={btn(true)}
              disabled={!depCmd}
              data-testid="will-panel-deposit"
              onClick={() => depCmd && onCommand(depCmd)}
            >
              RUN DEPOSIT
            </button>
          </div>
          <div className="grid gap-1.5">
            <div className={`text-[10px] ${theme.muted}`}>WITHDRAW</div>
            <input
              className={field}
              placeholder="token|eth"
              value={wdToken}
              onChange={(e) => setWdToken(e.target.value)}
              data-testid="will-panel-wd-token"
              spellCheck={false}
            />
            <input
              className={field}
              placeholder="amount|all"
              value={wdAmount}
              onChange={(e) => setWdAmount(e.target.value)}
              data-testid="will-panel-wd-amount"
              spellCheck={false}
            />
            <button
              type="button"
              className={btn(true)}
              disabled={!wdCmd}
              data-testid="will-panel-withdraw"
              onClick={() => wdCmd && onCommand(wdCmd)}
            >
              RUN WITHDRAW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
