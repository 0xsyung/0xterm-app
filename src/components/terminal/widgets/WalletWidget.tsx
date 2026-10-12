/**
 * @file WalletWidget.tsx
 * @description Local hot-wallet widgets: create/import/unlock/export/nuke/status/tx (#29).
 *   Settings > WALLET only hosts timeout + require-password-per-tx prefs (Stephy lock).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ThemeConfig } from "../types";
import PinButton from "./PinButton";
import {
  accountPath,
  assertPasswordPair,
  assertValidMnemonic,
  assertValidPrivateKey,
  createVault,
  generateSeed,
  getEnvelope,
  getUnlocked,
  hasVault,
  idleRemainingMs,
  importVault,
  isUnlocked,
  lockVault,
  nukeVault,
  passwordStrengthBars,
  subscribeVault,
  unlockVault,
  updateVaultPrefs,
  verifyPassword,
  WalletError,
  formatVaultImportAck,
  type VaultSource
} from "../../../lib/localWallet";
import { getSignerPref, setSignerPref } from "../../../lib/localWallet/vault";

export type WalletWidgetMode =
  | "status"
  | "create"
  | "import"
  | "unlock"
  | "export"
  | "nuke"
  | "txconfirm";

export type WalletTxConfirmPayload = {
  to: string;
  summary: string;
  value: string;
  chainLabel: string;
  gas?: string;
  /** When vault.requirePasswordPerTx — collect password before sign. */
  requirePassword?: boolean;
};

export type WalletWidgetPayload = {
  mode: WalletWidgetMode;
  words?: 12 | 24;
  tx?: WalletTxConfirmPayload;
};

const CREATE_BANNER =
  "HOT WALLET IN THIS BROWSER. Write these words on paper. 0xterm never sees them. Hardware via connect is safer.";

const HOT_SENTENCE =
  "local wallet is a hot wallet in this browser. hardware via connect is safer.";

function StrengthBars({
  password,
  theme
}: {
  password: string;
  theme: ThemeConfig;
}) {
  const bars = passwordStrengthBars(password);
  return (
    <div className="flex gap-1" aria-label={`password strength ${bars} of 3`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-6 border ${theme.border} ${
            i < bars ? theme.primary.replace("text-", "bg-") + " bg-current" : theme.muted
          }`}
          style={i < bars ? { backgroundColor: "currentColor", opacity: 0.85 } : undefined}
        />
      ))}
    </div>
  );
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function WalletWidget({
  theme,
  payload,
  onDone,
  onLog,
  onCancel,
  onPin,
  pinned,
  onVaultChange
}: {
  theme: ThemeConfig;
  payload: WalletWidgetPayload;
  onDone?: (msg: string) => void;
  onLog?: (text: string, warn?: boolean) => void;
  onCancel?: () => void;
  onPin?: () => void;
  pinned?: boolean;
  onVaultChange?: () => void;
}) {
  const mode = payload.mode;
  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  return (
    <div
      data-retain-focus=""
      data-wallet-widget={mode}
      className={`relative group my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} text-xs space-y-3 w-full max-w-xl ${theme.text}`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel?.();
        }
      }}
    >
      <div className={`flex justify-between items-center border-b ${theme.border} pb-1`}>
        <span className={`font-bold tracking-wider ${theme.primary}`}>
          {mode === "status"
            ? "LOCAL WALLET"
            : mode === "create"
              ? "WALLET CREATE"
              : mode === "import"
                ? "WALLET IMPORT"
                : mode === "unlock"
                  ? "WALLET UNLOCK"
                  : mode === "export"
                    ? "WALLET EXPORT"
                    : mode === "nuke"
                      ? "WALLET NUKE"
                      : "CONFIRM TX"}
        </span>
        <span className="flex items-center gap-2">
          {!pinned && mode === "status" && (
            <PinButton onPin={onPin} theme={theme} className="opacity-100" />
          )}
          {!pinned && mode !== "status" && (
            <button
              type="button"
              className={`px-2 py-0.5 border ${theme.border} ${theme.muted} ${touch}`}
              onClick={() => onCancel?.()}
            >
              cancel
            </button>
          )}
        </span>
      </div>

      {mode === "status" && (
        <StatusBody theme={theme} touch={touch} onVaultChange={onVaultChange} onLog={onLog} />
      )}
      {mode === "create" && (
        <CreateBody
          theme={theme}
          touch={touch}
          words={payload.words || 12}
          onDone={onDone}
          onVaultChange={onVaultChange}
          onLog={onLog}
        />
      )}
      {mode === "import" && (
        <ImportBody
          theme={theme}
          touch={touch}
          onDone={onDone}
          onVaultChange={onVaultChange}
          onLog={onLog}
        />
      )}
      {mode === "unlock" && (
        <UnlockBody
          theme={theme}
          touch={touch}
          onDone={onDone}
          onVaultChange={onVaultChange}
          onLog={onLog}
        />
      )}
      {mode === "export" && (
        <ExportBody theme={theme} touch={touch} onLog={onLog} onDone={onDone} />
      )}
      {mode === "nuke" && (
        <NukeBody
          theme={theme}
          touch={touch}
          onDone={onDone}
          onVaultChange={onVaultChange}
          onLog={onLog}
        />
      )}
      {mode === "txconfirm" && payload.tx && (
        <TxConfirmBody
          theme={theme}
          touch={touch}
          tx={payload.tx}
          onDone={onDone}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}

function StatusBody({
  theme,
  touch,
  onVaultChange,
  onLog
}: {
  theme: ThemeConfig;
  touch: string;
  onVaultChange?: () => void;
  onLog?: (text: string, warn?: boolean) => void;
}) {
  const [envelopeSource, setEnvelopeSource] = useState<VaultSource | "none">("none");
  const [addrs, setAddrs] = useState<string[]>([]);
  const [, bump] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const env = await getEnvelope();
      if (cancelled) return;
      if (!env) {
        setEnvelopeSource("none");
        setAddrs([]);
      } else {
        setEnvelopeSource(env.source);
        setAddrs(env.addresses || []);
      }
      bump((n) => n + 1);
    };
    void refresh();
    // Live-update an already-open status card on create/import/lock/nuke (#193).
    const unsub = subscribeVault(() => {
      void refresh();
    });
    const id = setInterval(() => bump((n) => n + 1), 1000);
    return () => {
      cancelled = true;
      unsub();
      clearInterval(id);
    };
  }, []);

  const u = getUnlocked();
  const state = !envelopeSource || envelopeSource === "none"
    ? "none"
    : u
      ? "unlocked"
      : "locked";
  const account = u
    ? `${u.selectedIndex}  ${shortAddr(u.accounts[u.selectedIndex]!.address)}`
    : addrs[0]
      ? `—  ${shortAddr(addrs[0]!)}`
      : "—";
  const signer = getSignerPref() || (u ? "local" : "none");
  const idleMs = idleRemainingMs();
  const idle =
    u && idleMs != null
      ? `${u.plaintext.timeoutMinutes}m (${Math.ceil(idleMs / 60000)}m left)`
      : "—";
  const path = u ? accountPath(u.selectedIndex) : "m/44'/60'/0'/0/n";

  return (
    <div className="space-y-2 font-mono">
      <div className={theme.warn}>{HOT_SENTENCE}</div>
      <div>source:   {envelopeSource}</div>
      <div>state:    {state}</div>
      <div>account:  {account}</div>
      <div>signer:   {signer}</div>
      <div>idle:     {idle}</div>
      <div>path:     {path}</div>
      {state === "locked" && addrs.length > 0 && (
        <div className={theme.muted}>
          vault addrs: {addrs.map(shortAddr).join(", ")}
        </div>
      )}
      {u && (
        <div className="space-y-2 pt-2 border-t border-current/20">
          <label className="flex items-center gap-2">
            <span className={theme.muted}>idle timeout (min)</span>
            <input
              type="number"
              min={1}
              max={60}
              defaultValue={u.plaintext.timeoutMinutes}
              className={`w-16 border ${theme.border} bg-transparent px-1 ${theme.text}`}
              onBlur={async (e) => {
                try {
                  await updateVaultPrefs({
                    timeoutMinutes: Number(e.target.value)
                  });
                  onVaultChange?.();
                } catch (err: unknown) {
                  onLog?.(err instanceof Error ? err.message : String(err), true);
                }
              }}
            />
          </label>
          <label className={`flex items-center gap-2 ${touch}`}>
            <input
              type="checkbox"
              checked={u.plaintext.requirePasswordPerTx}
              onChange={async (e) => {
                try {
                  await updateVaultPrefs({
                    requirePasswordPerTx: e.target.checked
                  });
                  onVaultChange?.();
                  bump((n) => n + 1);
                } catch (err: unknown) {
                  onLog?.(err instanceof Error ? err.message : String(err), true);
                }
              }}
            />
            <span>require password per tx</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`px-2 py-0.5 border ${theme.border} ${theme.primary} ${touch}`}
              onClick={() => {
                lockVault();
                onVaultChange?.();
                onLog?.("[✓] local wallet locked.");
              }}
            >
              LOCK
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 border ${theme.border} ${theme.muted} ${touch}`}
              onClick={() => {
                setSignerPref("local");
                onVaultChange?.();
              }}
            >
              USE LOCAL
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 border ${theme.border} ${theme.muted} ${touch}`}
              onClick={() => {
                setSignerPref("injected");
                onVaultChange?.();
              }}
            >
              USE INJECTED
            </button>
          </div>
        </div>
      )}
      {state === "none" && (
        <div className={theme.muted}>
          no local wallet. type <span className={theme.primary}>wallet create</span> or{" "}
          <span className={theme.primary}>wallet import</span>.
        </div>
      )}
    </div>
  );
}

function CreateBody({
  theme,
  touch,
  words,
  onDone,
  onVaultChange
}: {
  theme: ThemeConfig;
  touch: string;
  words: 12 | 24;
  onDone?: (msg: string) => void;
  onVaultChange?: () => void;
  onLog?: (text: string, warn?: boolean) => void;
}) {
  const seed = useMemo(() => generateSeed(words), [words]);
  const parts = seed.split(" ");
  const [wrote, setWrote] = useState(false);
  const [step, setStep] = useState<"show" | "confirm" | "password">("show");
  const [indices] = useState(() => {
    const a = Math.floor(Math.random() * parts.length);
    let b = Math.floor(Math.random() * parts.length);
    while (b === a) b = Math.floor(Math.random() * parts.length);
    return [a, b].sort((x, y) => x - y) as [number, number];
  });
  const [w0, setW0] = useState("");
  const [w1, setW1] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cols = words === 24 ? 6 : 4;

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      assertPasswordPair(pw, pw2);
      const { address } = await createVault({
        mnemonic: seed,
        password: pw,
        passwordConfirm: pw2,
        passphrase: passphrase || undefined
      });
      onVaultChange?.();
      onDone?.(
        `[✓] local wallet ${shortAddr(address)} (account 0). type wallet lock when you step away.`
      );
    } catch (e: unknown) {
      setErr((e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className={`${theme.warn} leading-snug`}>{CREATE_BANNER}</div>
      {step === "show" && (
        <>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {parts.map((w, i) => (
              <div
                key={i}
                className={`border ${theme.border} px-1 py-1 ${theme.primary}`}
                style={{ userSelect: "all" }}
              >
                <span className={theme.muted}>{i + 1}.</span> {w}
              </div>
            ))}
          </div>
          <label className={`flex items-center gap-2 ${touch}`}>
            <input
              type="checkbox"
              checked={wrote}
              onChange={(e) => setWrote(e.target.checked)}
            />
            I wrote these words down
          </label>
          <button
            type="button"
            disabled={!wrote}
            className={`px-2 py-1 border ${theme.border} ${theme.primary} ${touch} disabled:opacity-40`}
            onClick={() => setStep("confirm")}
          >
            continue
          </button>
        </>
      )}
      {step === "confirm" && (
        <>
          <div className={theme.muted}>
            type word {indices[0]! + 1} and word {indices[1]! + 1}
          </div>
          <input
            className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text}`}
            value={w0}
            onChange={(e) => setW0(e.target.value)}
            placeholder={`word ${indices[0]! + 1}`}
            autoComplete="off"
          />
          <input
            className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text}`}
            value={w1}
            onChange={(e) => setW1(e.target.value)}
            placeholder={`word ${indices[1]! + 1}`}
            autoComplete="off"
          />
          <button
            type="button"
            className={`px-2 py-1 border ${theme.border} ${theme.primary} ${touch}`}
            onClick={() => {
              if (
                w0.trim().toLowerCase() !== parts[indices[0]!] ||
                w1.trim().toLowerCase() !== parts[indices[1]!]
              ) {
                setErr(
                  `word ${indices[0]! + 1} did not match. seed was not stored.`
                );
                return;
              }
              setErr(null);
              setStep("password");
            }}
          >
            continue
          </button>
        </>
      )}
      {step === "password" && (
        <>
          <div className={theme.muted}>password (min 8)</div>
          <input
            type="password"
            className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text}`}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
          />
          <StrengthBars password={pw} theme={theme} />
          <input
            type="password"
            className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text}`}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="confirm password"
            autoComplete="new-password"
          />
          <button
            type="button"
            className={`text-left ${theme.muted} underline`}
            onClick={() => setShowPassphrase((v) => !v)}
          >
            BIP-39 passphrase (optional, empty = none)
          </button>
          {showPassphrase && (
            <input
              type="password"
              className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text}`}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="passphrase"
            />
          )}
          <button
            type="button"
            disabled={busy}
            className={`px-2 py-1 border ${theme.border} ${theme.primary} ${touch}`}
            onClick={() => void submit()}
          >
            {busy ? "deriving key…" : "create"}
          </button>
        </>
      )}
      {err && <div className={theme.warn}>{err}</div>}
    </div>
  );
}

function ImportBody({
  theme,
  touch,
  onDone,
  onVaultChange
}: {
  theme: ThemeConfig;
  touch: string;
  onDone?: (msg: string) => void;
  onVaultChange?: () => void;
  onLog?: (text: string, warn?: boolean) => void;
}) {
  const [secret, setSecret] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [replace, setReplace] = useState(false);
  const [needReplace, setNeedReplace] = useState(false);
  const [replaceTyped, setReplaceTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void hasVault().then((h) => setNeedReplace(h));
  }, []);

  const clearSecret = () => {
    setSecret("");
    if (taRef.current) taRef.current.value = "";
    try {
      if (document.hasFocus()) void navigator.clipboard?.writeText("");
    } catch {
      /* best-effort */
    }
  };

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (needReplace && (!replace || replaceTyped !== "REPLACE")) {
        setErr("this will replace the existing local wallet. type REPLACE to continue.");
        setBusy(false);
        return;
      }
      assertPasswordPair(pw, pw2);
      // validate shape early
      const trimmed = secret.trim();
      if (/^(0x)?[0-9a-fA-F]{64}$/.test(trimmed) && !/\s/.test(trimmed)) {
        assertValidPrivateKey(trimmed);
      } else {
        assertValidMnemonic(trimmed);
      }
      const { address, source } = await importVault({
        secret: trimmed,
        password: pw,
        passwordConfirm: pw2,
        passphrase: passphrase || undefined,
        replace: needReplace
      });
      clearSecret();
      onVaultChange?.();
      onDone?.(formatVaultImportAck(source, shortAddr(address)));
    } catch (e: unknown) {
      if (e instanceof WalletError && e.code === "WALLET_EXISTS") {
        setNeedReplace(true);
        setErr(
          "this will replace the existing local wallet. type REPLACE to continue."
        );
      } else {
        setErr((e instanceof Error ? e.message : String(e)));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className={theme.warn}>{CREATE_BANNER}</div>
      <textarea
        ref={taRef}
        rows={3}
        className={`w-full border ${theme.border} bg-transparent px-2 py-1 font-mono ${theme.text}`}
        placeholder="mnemonic (12/24) or 0x private key"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        autoComplete="off"
      />
      {needReplace && (
        <>
          <div className={theme.warn}>
            this will replace the existing local wallet. type REPLACE to continue.
          </div>
          <input
            className={`w-full border ${theme.border} bg-transparent px-2 py-1`}
            value={replaceTyped}
            onChange={(e) => {
              setReplaceTyped(e.target.value);
              setReplace(e.target.value === "REPLACE");
            }}
            placeholder="REPLACE"
          />
        </>
      )}
      <input
        type="password"
        className={`w-full border ${theme.border} bg-transparent px-2 py-1`}
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="password (min 8)"
        autoComplete="new-password"
      />
      <StrengthBars password={pw} theme={theme} />
      <input
        type="password"
        className={`w-full border ${theme.border} bg-transparent px-2 py-1`}
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        placeholder="confirm password"
        autoComplete="new-password"
      />
      <button
        type="button"
        className={`text-left ${theme.muted} underline`}
        onClick={() => setShowPassphrase((v) => !v)}
      >
        BIP-39 passphrase (optional, empty = none)
      </button>
      {showPassphrase && (
        <input
          type="password"
          className={`w-full border ${theme.border} bg-transparent px-2 py-1`}
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="passphrase"
        />
      )}
      <button
        type="button"
        disabled={busy}
        className={`px-2 py-1 border ${theme.border} ${theme.primary} ${touch}`}
        onClick={() => void submit()}
      >
        {busy ? "deriving key…" : "import"}
      </button>
      {err && <div className={theme.warn}>{err}</div>}
    </div>
  );
}

function UnlockBody({
  theme,
  touch,
  onDone,
  onVaultChange
}: {
  theme: ThemeConfig;
  touch: string;
  onDone?: (msg: string) => void;
  onVaultChange?: () => void;
  onLog?: (text: string, warn?: boolean) => void;
}) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [disabledUntil, setDisabledUntil] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    if (Date.now() < disabledUntil) {
      setErr("too many unlock attempts. try again in a few minutes.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const addr = await unlockVault(pw);
      setPw("");
      onVaultChange?.();
      onDone?.(`[✓] unlocked ${shortAddr(addr)}.`);
    } catch (e: unknown) {
      if (e instanceof WalletError && e.code === "WALLET_RATE_LIMIT") {
        setDisabledUntil(Date.now() + 5 * 60_000);
      }
      setErr((e instanceof Error ? e.message : "wrong password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="password"
        className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text}`}
        value={pw}
        disabled={disabledUntil > 0}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder="password"
        autoComplete="current-password"
      />
      <button
        type="button"
        disabled={busy}
        className={`px-2 py-1 border ${theme.border} ${theme.primary} ${touch}`}
        onClick={() => void submit()}
      >
        {busy ? "deriving key…" : "unlock"}
      </button>
      {err && <div className={theme.warn}>{err}</div>}
    </div>
  );
}

function ExportBody({
  theme,
  touch,
  onLog,
  onDone
}: {
  theme: ThemeConfig;
  touch: string;
  onLog?: (text: string, warn?: boolean) => void;
  onDone?: (msg: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [yes, setYes] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!isUnlocked()) {
    return <div className={theme.warn}>wallet is locked. type wallet unlock.</div>;
  }

  const reveal = async () => {
    setErr(null);
    if (yes !== "YES") {
      setErr("type YES to reveal.");
      return;
    }
    const ok = await verifyPassword(pw);
    if (!ok) {
      setErr("wrong password.");
      return;
    }
    const u = getUnlocked();
    if (!u) return;
    setRevealed(u.plaintext.mnemonic || u.plaintext.privateKey || "");
    onDone?.("[✓] seed revealed in widget only — not written to the log.");
  };

  return (
    <div className={`space-y-2 ${theme.warn}`}>
      <div>this is the seed. anyone with it owns the account.</div>
      <input
        type="password"
        className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text}`}
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="password"
      />
      <input
        className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text}`}
        value={yes}
        onChange={(e) => setYes(e.target.value)}
        placeholder="type YES"
      />
      <button
        type="button"
        className={`px-2 py-1 border ${theme.border} ${theme.primary} ${touch}`}
        onClick={() => void reveal()}
      >
        reveal
      </button>
      {revealed && (
        <div
          className={`border ${theme.border} p-2 ${theme.primary}`}
          style={{ userSelect: "all" }}
        >
          {revealed}
          <div className="mt-2">
            <button
              type="button"
              className={`px-2 py-0.5 border ${theme.border} ${theme.muted} ${touch}`}
              onClick={() => {
                try {
                  void navigator.clipboard?.writeText(revealed);
                  onLog?.("[✓] copied.");
                } catch {
                  onLog?.("[!] clipboard denied.", true);
                }
              }}
            >
              copy
            </button>
          </div>
        </div>
      )}
      {err && <div>{err}</div>}
    </div>
  );
}

function NukeBody({
  theme,
  touch,
  onDone,
  onVaultChange
}: {
  theme: ThemeConfig;
  touch: string;
  onDone?: (msg: string) => void;
  onVaultChange?: () => void;
  onLog?: (text: string, warn?: boolean) => void;
}) {
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className={theme.warn}>
        wipe the IndexedDB vault on this device. type DELETE to confirm.
      </div>
      <input
        className={`w-full border ${theme.border} bg-transparent px-2 py-1`}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="DELETE"
      />
      <button
        type="button"
        className={`px-2 py-1 border ${theme.border} ${theme.warn} ${touch}`}
        onClick={async () => {
          if (typed !== "DELETE") {
            setErr("nuke cancelled.");
            return;
          }
          await nukeVault();
          onVaultChange?.();
          onDone?.("[✓] local vault wiped.");
        }}
      >
        nuke
      </button>
      {err && <div className={theme.warn}>{err}</div>}
    </div>
  );
}

function TxConfirmBody({
  theme,
  touch,
  tx,
  onDone,
  onCancel
}: {
  theme: ThemeConfig;
  touch: string;
  tx: WalletTxConfirmPayload;
  onDone?: (msg: string) => void;
  onCancel?: () => void;
}) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sign = async () => {
    setErr(null);
    if (tx.requirePassword) {
      setBusy(true);
      try {
        const ok = await verifyPassword(pw);
        if (!ok) {
          setErr("wrong password.");
          return;
        }
      } finally {
        setBusy(false);
      }
    }
    onDone?.("sign");
  };

  return (
    <div className="space-y-2 font-mono">
      <div>to:      {tx.to}</div>
      <div>summary: {tx.summary}</div>
      <div>value:   {tx.value}</div>
      <div>chain:   {tx.chainLabel}</div>
      {tx.gas && <div>gas:     {tx.gas}</div>}
      {tx.requirePassword && (
        <input
          type="password"
          className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text}`}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="password (required for this tx)"
          autoComplete="current-password"
        />
      )}
      {err && <div className={theme.warn}>{err}</div>}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          disabled={busy}
          className={`px-3 py-1 border ${theme.border} ${theme.primary} ${touch}`}
          onClick={() => void sign()}
        >
          sign
        </button>
        <button
          type="button"
          className={`px-3 py-1 border ${theme.border} ${theme.muted} ${touch}`}
          onClick={() => {
            onCancel?.();
            onDone?.("cancel");
          }}
        >
          cancel
        </button>
      </div>
    </div>
  );
}
