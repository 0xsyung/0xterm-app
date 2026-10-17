/**
 * @file WillActionWidget.tsx
 * @description will set/heartbeat/deposit/withdraw/cancel/claim confirm (#26)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  usePublicClient,
  useWriteContract
} from "wagmi";
import {
  encodeFunctionData,
  type Address,
  type Chain,
  type Abi
} from "viem";
import type { ThemeConfig } from "../types";
import { WILL_LEGAL_BANNER, truncateAddr } from "../will/constants";
import { mapWillError } from "../will/errors";

export type WillActionKind =
  | "create"
  | "setHeir"
  | "setDelay"
  | "setBoth"
  | "heartbeat"
  | "deposit"
  | "depositToken"
  | "withdraw"
  | "cancel"
  | "claim";

export type WillActionPayload = {
  kind: WillActionKind;
  /** Primary contract to call (factory for create, vault otherwise). */
  to: Address;
  chain: Chain;
  userAddress: Address;
  /** Human labels */
  functionLabel: string;
  valueWei?: bigint;
  /** Encoded call pieces for writeContract */
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  /** Optional second write (set both heir+delay). */
  second?: {
    functionName: string;
    args?: readonly unknown[];
    functionLabel: string;
  };
  /** ERC-20 approve before depositToken */
  approve?: {
    token: Address;
    spender: Address;
    amount: bigint;
  };
  /** Soft warn when EOA native may be too low after deposit */
  gasWarn?: string;
  /** Show legal banner (first will set) */
  showLegal?: boolean;
  summaryLines?: { label: string; value: string }[];
};

type Status =
  | "simulating"
  | "ready"
  | "needs_confirm"
  | "needs_approval"
  | "approving"
  | "sending"
  | "waiting"
  | "success"
  | "error"
  | "cancelled";

const erc20ApproveAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;

export default function WillActionWidget({
  theme,
  payload,
  writeContract: writeOverride,
  sendTransaction: sendOverride
}: {
  theme: ThemeConfig;
  payload: WillActionPayload;
  writeContract?: (args: {
    chainId: number;
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
  }) => Promise<`0x${string}`>;
  sendTransaction?: (args: {
    chainId: number;
    to: Address;
    data?: `0x${string}`;
    value?: bigint;
  }) => Promise<`0x${string}`>;
}) {
  const needsTypeConfirm =
    payload.kind === "cancel" || payload.kind === "claim";
  const typeWord = payload.kind === "cancel" ? "cancel" : "claim";

  const [status, setStatus] = useState<Status>(
    payload.approve ? "needs_approval" : "simulating"
  );
  const [typed, setTyped] = useState("");
  const [gasEst, setGasEst] = useState<string | null>(null);
  const [simErr, setSimErr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const publicClient = usePublicClient({ chainId: payload.chain.id });
  const { writeContractAsync } = useWriteContract();

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  const doWrite = useCallback(
    async (args: {
      address: Address;
      abi: readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
      value?: bigint;
    }) => {
      if (writeOverride) {
        return writeOverride({
          chainId: payload.chain.id,
          ...args
        });
      }
      return writeContractAsync({
        chainId: payload.chain.id,
        address: args.address,
        abi: args.abi as Abi,
        functionName: args.functionName,
        args: args.args as never,
        value: args.value
      });
    },
    [writeOverride, writeContractAsync, payload.chain.id]
  );

  const simulate = useCallback(async () => {
    if (!publicClient) {
      setStatus(needsTypeConfirm ? "needs_confirm" : "ready");
      return;
    }
    setStatus("simulating");
    setSimErr(null);
    try {
      // estimateGas via eth_call path
      const data = encodeFunctionData({
        abi: payload.abi,
        functionName: payload.functionName,
        args: payload.args as never
      });
      const gas = await publicClient.estimateGas({
        account: payload.userAddress,
        to: payload.to,
        data,
        value: payload.valueWei ?? 0n
      });
      setGasEst(gas.toString());
      // Also simulateContract for custom errors
      try {
        await publicClient.simulateContract({
          address: payload.to,
          abi: payload.abi,
          functionName: payload.functionName,
          args: payload.args as never,
          account: payload.userAddress,
          value: payload.valueWei
        });
      } catch (simE) {
        setSimErr(mapWillError(simE));
        setStatus("error");
        return;
      }
      if (payload.approve) {
        setStatus("needs_approval");
      } else {
        setStatus(needsTypeConfirm ? "needs_confirm" : "ready");
      }
    } catch (e) {
      setSimErr(mapWillError(e));
      setStatus("error");
    }
  }, [publicClient, payload, needsTypeConfirm]);

  useEffect(() => {
    void simulate();
  }, [simulate]);

  const handleApprove = async () => {
    if (!payload.approve) return;
    setStatus("approving");
    setErrorMsg(null);
    try {
      const hash = await doWrite({
        address: payload.approve.token,
        abi: erc20ApproveAbi,
        functionName: "approve",
        args: [payload.approve.spender, payload.approve.amount]
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setStatus(needsTypeConfirm ? "needs_confirm" : "ready");
    } catch (e) {
      setStatus("needs_approval");
      setErrorMsg(mapWillError(e));
    }
  };

  const handleSend = async () => {
    if (needsTypeConfirm && typed !== typeWord) {
      setErrorMsg(`type ${typeWord} to confirm.`);
      return;
    }
    if (simErr) return;
    setStatus("sending");
    setErrorMsg(null);
    try {
      const hash = await doWrite({
        address: payload.to,
        abi: payload.abi,
        functionName: payload.functionName,
        args: payload.args,
        value: payload.valueWei
      });
      setTxHash(hash);
      setStatus("waiting");
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          setStatus("error");
          setErrorMsg("Transaction reverted.");
          return;
        }
      }
      if (payload.second) {
        const hash2 = await doWrite({
          address: payload.to,
          abi: payload.abi,
          functionName: payload.second.functionName,
          args: payload.second.args
        });
        setTxHash(hash2);
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: hash2 });
        }
      }
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setErrorMsg(mapWillError(e));
    }
  };

  const explorer =
    txHash && payload.chain.blockExplorers?.default?.url
      ? `${payload.chain.blockExplorers.default.url}/tx/${txHash}`
      : null;

  const sendEnabled =
    !simErr &&
    (status === "ready" ||
      status === "needs_confirm" ||
      status === "error") &&
    (!needsTypeConfirm || typed === typeWord);

  void sendOverride;

  return (
    <div
      className={`relative my-3 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} max-w-md ${theme.text} text-xs`}
    >
      <div
        className={`flex justify-between border-b ${theme.border} pb-1 mb-2 text-[10px] tracking-wider`}
      >
        <span className={`font-bold ${theme.primary}`}>
          WILL {payload.functionLabel.toUpperCase()}
        </span>
        <span className={theme.muted}>
          {payload.chain.name?.toUpperCase()} · {payload.chain.id}
        </span>
      </div>

      {payload.showLegal && (
        <div
          className={`mb-2 p-2 border text-[9px] leading-snug ${theme.warn} ${theme.rounded}`}
        >
          {WILL_LEGAL_BANNER}
        </div>
      )}

      <div className="space-y-1 text-[10px] tabular-nums">
        <div>
          <span className={theme.muted}>TO </span>
          <span className="font-mono normal-case">
            {truncateAddr(payload.to)}
          </span>
        </div>
        <div>
          <span className={theme.muted}>FUNCTION </span>
          <span className={theme.primary}>{payload.functionLabel}</span>
          {payload.second && (
            <span className={theme.muted}>
              {" "}
              + {payload.second.functionLabel}
            </span>
          )}
        </div>
        <div>
          <span className={theme.muted}>VALUE </span>
          <span>
            {payload.valueWei != null && payload.valueWei > 0n
              ? `${payload.valueWei.toString()} wei`
              : "0"}
          </span>
        </div>
        <div>
          <span className={theme.muted}>EST. GAS </span>
          <span>{gasEst ?? (status === "simulating" ? "…" : "—")}</span>
        </div>
        {payload.summaryLines?.map((l) => (
          <div key={l.label}>
            <span className={theme.muted}>{l.label} </span>
            <span className="normal-case">{l.value}</span>
          </div>
        ))}
        {payload.gasWarn && (
          <div className={theme.warn}>{payload.gasWarn}</div>
        )}
      </div>

      {needsTypeConfirm && status !== "success" && status !== "cancelled" && (
        <div className="mt-2 space-y-1">
          <div className={`text-[10px] ${theme.warn}`}>
            type <span className="font-bold">{typeWord}</span> to enable send
          </div>
          <input
            className={`w-full border ${theme.border} bg-transparent px-2 py-1 ${theme.text} normal-case ${touch}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={`type ${typeWord}`}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      {(simErr || errorMsg) && (
        <div className={`mt-2 p-2 border ${theme.warn} ${theme.rounded}`}>
          {errorMsg || simErr}
        </div>
      )}

      {status === "success" && (
        <div className={`mt-2 space-y-1 ${theme.primary}`}>
          <div>[✓] confirmed</div>
          {txHash && (
            <div className="font-mono break-all text-[10px] normal-case">
              {txHash}
              {explorer && (
                <>
                  {" "}
                  <a
                    href={explorer}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    explorer
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {status !== "success" && status !== "cancelled" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {status === "needs_approval" || status === "approving" ? (
            <button
              type="button"
              disabled={status === "approving"}
              className={`px-3 py-1 border ${theme.border} ${theme.primary} font-bold text-[10px] ${touch}`}
              onClick={() => void handleApprove()}
            >
              {status === "approving" ? "APPROVING…" : "APPROVE"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!sendEnabled}
              className={`px-3 py-1 border ${theme.border} ${theme.primary} font-bold text-[10px] ${touch} disabled:opacity-40`}
              onClick={() => void handleSend()}
            >
              {status === "simulating"
                ? "SIMULATING…"
                : status === "sending" || status === "waiting"
                  ? "SENDING…"
                  : "SEND"}
            </button>
          )}
          <button
            type="button"
            disabled={status === "sending" || status === "waiting"}
            className={`px-3 py-1 border ${theme.border} ${theme.muted} text-[10px] ${touch}`}
            onClick={() => {
              setStatus("cancelled");
              setErrorMsg("Cancelled.");
            }}
          >
            CANCEL
          </button>
        </div>
      )}
    </div>
  );
}
