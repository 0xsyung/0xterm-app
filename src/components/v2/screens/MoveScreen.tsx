/**
 * @file MoveScreen.tsx
 * @description V2 Move hub M0–M3 (#295) — Send / Receive / Swap (no Bridge day one)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount } from "wagmi";
import type { ThemeConfig } from "@/components/terminal/types";
import { BTN_TOUCH, btnClass } from "@/components/terminal/ui/buttonClasses";
import { V2_MOVE_ACTIONS, type V2MoveAction } from "../nav";
import { V2_MAINNET_CHAINS, v2ChainShortName } from "../networks";
import { useV2 } from "../V2Context";

function looksChecksumWarning(raw: string): boolean {
  if (!isAddress(raw, { strict: false })) return true;
  // Mixed-case that fails checksum
  if (/[A-F]/.test(raw) && !isAddress(raw, { strict: true })) return true;
  return false;
}

export default function MoveScreen({
  theme,
  isConnected,
  onConnect
}: {
  theme: ThemeConfig;
  isConnected: boolean;
  onConnect: () => void;
}) {
  const { moveAction, setMoveAction, prefill, lastChainId, setLastChainId } =
    useV2();
  const { address: walletAddress } = useAccount();
  const [asset, setAsset] = useState(prefill.symbol || "ETH");
  const [chainId, setChainId] = useState(
    prefill.chainId || lastChainId || 1
  );
  const [amount, setAmount] = useState(prefill.amount || "");
  const [recipient, setRecipient] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tokenOut, setTokenOut] = useState("USDC");

  const action: V2MoveAction | null = moveAction;

  const amountReady = !!amount && Number(amount) > 0;
  /** Live fee/quote not wired yet — never invent a dollar figure. */
  const feeEstimateLabel = amountReady
    ? "Fee estimate unavailable until quote is wired"
    : null;
  const quoteLabel = amountReady
    ? "Quote unavailable until swap routing is wired"
    : null;

  if (!isConnected) {
    return (
      <section data-testid="v2-move" className={`flex flex-col gap-4 p-4 ${theme.text}`}>
        <h1 className={`text-lg font-bold ${theme.primary}`}>Move</h1>
        <p className={theme.muted}>
          Connect to send, receive, or swap on supported mainnets.
        </p>
        <button
          type="button"
          data-testid="v2-move-connect"
          onClick={onConnect}
          className={btnClass({ theme, variant: "primary", size: "lg", className: "self-start w-fit" })}
          style={{ background: theme.phosphor, color: "#000" }}
        >
          Connect
        </button>
      </section>
    );
  }

  if (!action) {
    return (
      <section data-testid="v2-move" className={`flex flex-col gap-4 p-4 ${theme.text}`}>
        <h1 className={`text-lg font-bold ${theme.primary}`}>Move</h1>
        <div className="grid grid-cols-1 gap-2" data-testid="v2-move-hub">
          {V2_MOVE_ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              data-testid={`v2-move-card-${a.id}`}
              onClick={() => setMoveAction(a.id)}
              className={`text-left min-h-[72px] p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${BTN_TOUCH}`}
            >
              <div className={`font-bold ${theme.primary}`}>{a.label}</div>
              <div className={`text-[11px] ${theme.muted}`}>{a.hint}</div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const chainSelect = (
    <label className="flex flex-col gap-1">
      <span className={`text-[11px] ${theme.muted}`}>Chain</span>
      <select
        data-testid="v2-move-chain"
        className={`min-h-[44px] px-3 text-base border ${theme.border} ${theme.bg} ${theme.text} ${theme.rounded}`}
        value={chainId}
        onChange={(e) => {
          const id = Number(e.target.value);
          setChainId(id);
          setLastChainId(id);
        }}
      >
        {V2_MAINNET_CHAINS.map((c) => (
          <option key={c.id} value={c.id}>
            {v2ChainShortName(c.id)} — {c.name}
          </option>
        ))}
      </select>
    </label>
  );

  if (action === "receive") {
    return (
      <section data-testid="v2-move-receive" className={`flex flex-col gap-3 p-4 ${theme.text}`}>
        <button
          type="button"
          className={btnClass({ theme, variant: "ghost", size: "md" })}
          onClick={() => setMoveAction(null)}
        >
          ← Move
        </button>
        <h2 className={`text-base font-bold ${theme.primary}`}>Receive</h2>
        {chainSelect}
        <div className={`border ${theme.border} ${theme.cardBg} ${theme.rounded} p-4`}>
          <div className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>
            Deposit address
          </div>
          <div
            className="font-mono text-xs break-all mt-1"
            data-testid="v2-receive-address"
          >
            {walletAddress || "—"}
          </div>
          <p className={`text-[11px] mt-2 ${theme.muted}`}>
            Mainnet only — never send testnet funds to this address.
          </p>
        </div>
      </section>
    );
  }

  const checksumWarn =
    action === "send" && recipient.trim()
      ? looksChecksumWarning(recipient.trim())
      : false;

  return (
    <section
      data-testid={`v2-move-${action}`}
      className={`flex flex-col gap-3 p-4 ${theme.text}`}
    >
      <button
        type="button"
        className={btnClass({ theme, variant: "ghost", size: "md" })}
        onClick={() => {
          setConfirmOpen(false);
          setMoveAction(null);
        }}
      >
        ← Move
      </button>
      <h2 className={`text-base font-bold ${theme.primary} capitalize`}>
        {action}
      </h2>
      {chainSelect}
      <label className="flex flex-col gap-1">
        <span className={`text-[11px] ${theme.muted}`}>Asset</span>
        <input
          data-testid="v2-move-asset"
          className={`min-h-[44px] px-3 text-base border ${theme.border} ${theme.bg} ${theme.text} ${theme.rounded}`}
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        />
      </label>
      {action === "swap" && (
        <label className="flex flex-col gap-1">
          <span className={`text-[11px] ${theme.muted}`}>Token out</span>
          <input
            data-testid="v2-move-token-out"
            className={`min-h-[44px] px-3 text-base border ${theme.border} ${theme.bg} ${theme.text} ${theme.rounded}`}
            value={tokenOut}
            onChange={(e) => setTokenOut(e.target.value)}
          />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className={`text-[11px] ${theme.muted}`}>Amount</span>
        <input
          data-testid="v2-move-amount"
          inputMode="decimal"
          className={`min-h-[44px] px-3 text-base border ${theme.border} ${theme.bg} ${theme.text} ${theme.rounded}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      {action === "send" && (
        <label className="flex flex-col gap-1">
          <span className={`text-[11px] ${theme.muted}`}>Recipient</span>
          <input
            data-testid="v2-move-recipient"
            className={`min-h-[44px] px-3 text-base border ${theme.border} ${theme.bg} ${theme.text} ${theme.rounded}`}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x… or ENS"
          />
          {checksumWarn && (
            <span className={theme.warn} data-testid="v2-checksum-warn">
              Address checksum warning — verify before confirming.
            </span>
          )}
        </label>
      )}
      {action === "swap" && (
        <label className="flex flex-col gap-1">
          <span className={`text-[11px] ${theme.muted}`}>Slippage %</span>
          <input
            data-testid="v2-move-slippage"
            className={`min-h-[44px] px-3 text-base border ${theme.border} ${theme.bg} ${theme.text} ${theme.rounded}`}
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
          />
        </label>
      )}
      {feeEstimateLabel && (
        <p className={`text-[11px] ${theme.muted}`} data-testid="v2-move-fee">
          {feeEstimateLabel}
        </p>
      )}
      {action === "swap" && quoteLabel && (
        <p className={`text-[11px] ${theme.muted}`} data-testid="v2-move-quote">
          {quoteLabel}
        </p>
      )}

      {!confirmOpen ? (
        <button
          type="button"
          data-testid="v2-move-review"
          className={btnClass({ theme, variant: "primary", size: "lg", className: "self-start w-fit" })}
          style={{ background: theme.phosphor, color: "#000" }}
          onClick={() => setConfirmOpen(true)}
        >
          Review
        </button>
      ) : (
        <div
          className={`border ${theme.border} ${theme.cardBg} ${theme.rounded} p-4 flex flex-col gap-2`}
          data-testid="v2-move-confirm"
        >
          <div className={`font-bold ${theme.primary}`}>Confirm</div>
          <div className="text-sm">
            {amount || "—"} {asset} on {v2ChainShortName(chainId)}
          </div>
          {action === "send" && (
            <div className="text-sm break-all">
              To{" "}
              {isAddress(recipient.trim(), { strict: false })
                ? getAddress(recipient.trim())
                : recipient || "—"}
            </div>
          )}
          {action === "swap" && (
            <>
              <div className="text-sm">
                Min out: unavailable until swap routing is wired ({tokenOut})
              </div>
              <div className={`text-[11px] ${theme.muted}`}>
                {feeEstimateLabel || "Fee estimate unavailable"} · Slippage{" "}
                {slippage}%
              </div>
            </>
          )}
          {action === "send" && feeEstimateLabel && (
            <div className={`text-[11px] ${theme.muted}`}>{feeEstimateLabel}</div>
          )}
          <button
            type="button"
            data-testid="v2-move-confirm-cta"
            className={btnClass({ theme, variant: "primary", size: "lg", className: "self-start w-fit" })}
            style={{ background: theme.phosphor, color: "#000" }}
          >
            Confirm {action}
          </button>
        </div>
      )}
    </section>
  );
}
