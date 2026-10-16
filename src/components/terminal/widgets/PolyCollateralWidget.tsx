/**
 * @file PolyCollateralWidget.tsx
 * @description poly wrap / unwrap / approve confirms — not pinnable (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useState } from "react";
import { useSendTransaction, usePublicClient } from "wagmi";
import { formatUnits, type Address, type Chain } from "viem";
import type { ThemeConfig } from "../types";
import {
  encodePusdApproveExchange,
  encodePusdApproveOfframp,
  encodeUnwrap,
  encodeUsdceApproveOnramp,
  encodeWrap,
  truncateAddr
} from "../poly";
import { POLY_USDCE } from "../poly/constants";

export type PolyCollateralKind = "wrap" | "unwrap" | "approve";

type Props = {
  theme: ThemeConfig;
  targetChain: Chain;
  userAddress: Address;
  kind: PolyCollateralKind;
  amountWei: bigint;
  /** Exchange for approve; ignored for wrap/unwrap. */
  spender?: Address;
  isRevoke?: boolean;
};

export default function PolyCollateralWidget({
  theme,
  targetChain,
  userAddress,
  kind,
  amountWei,
  spender,
  isRevoke
}: Props) {
  const [status, setStatus] = useState<
    "idle" | "step1" | "waiting1" | "step2" | "waiting2" | "success" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needApproveAsset, setNeedApproveAsset] = useState(kind !== "approve");

  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { sendTransactionAsync } = useSendTransaction();
  const blockExplorer = targetChain.blockExplorers?.default.url;
  const human = formatUnits(amountWei, 6);

  const header =
    kind === "wrap"
      ? "POLY WRAP"
      : kind === "unwrap"
        ? "POLY UNWRAP"
        : isRevoke
          ? "POLY REVOKE"
          : "POLY APPROVE";

  const run = async () => {
    setErrorMsg(null);
    try {
      if (kind === "approve") {
        if (!spender) throw new Error("Missing Exchange spender");
        setStatus("step1");
        const { to, data } = encodePusdApproveExchange(spender, amountWei);
        const hash = await sendTransactionAsync({
          chainId: targetChain.id,
          to,
          data,
          value: 0n
        });
        setTxHash(hash);
        setStatus("waiting1");
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === "reverted") throw new Error("Approval reverted");
        }
        setStatus("success");
        return;
      }

      if (kind === "wrap") {
        if (needApproveAsset) {
          setStatus("step1");
          const { to, data } = encodeUsdceApproveOnramp(amountWei);
          const hash = await sendTransactionAsync({
            chainId: targetChain.id,
            to,
            data,
            value: 0n
          });
          setTxHash(hash);
          setStatus("waiting1");
          if (publicClient) {
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            if (receipt.status === "reverted") throw new Error("USDC.e approve reverted");
          }
          setNeedApproveAsset(false);
        }
        setStatus("step2");
        const wrap = encodeWrap(userAddress, amountWei);
        const hash2 = await sendTransactionAsync({
          chainId: targetChain.id,
          to: wrap.to,
          data: wrap.data,
          value: 0n
        });
        setTxHash(hash2);
        setStatus("waiting2");
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: hash2 });
          if (receipt.status === "reverted") throw new Error("Wrap reverted");
        }
        setStatus("success");
        return;
      }

      // unwrap
      if (needApproveAsset) {
        setStatus("step1");
        const { to, data } = encodePusdApproveOfframp(amountWei);
        const hash = await sendTransactionAsync({
          chainId: targetChain.id,
          to,
          data,
          value: 0n
        });
        setTxHash(hash);
        setStatus("waiting1");
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === "reverted") throw new Error("pUSD approve reverted");
        }
        setNeedApproveAsset(false);
      }
      setStatus("step2");
      const un = encodeUnwrap(userAddress, amountWei);
      const hash2 = await sendTransactionAsync({
        chainId: targetChain.id,
        to: un.to,
        data: un.data,
        value: 0n
      });
      setTxHash(hash2);
      setStatus("waiting2");
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: hash2 });
        if (receipt.status === "reverted") throw new Error("Unwrap reverted");
      }
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Rejected or failed";
      // never dump stacks
      setErrorMsg(msg.split("\n")[0]?.slice(0, 200) || "Rejected or failed");
    }
  };

  const busy = status === "step1" || status === "waiting1" || status === "step2" || status === "waiting2";

  return (
    <div
      className={`my-2 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} w-full text-xs space-y-3`}
    >
      <div className={`flex justify-between items-center border-b ${theme.border} pb-2`}>
        <span className={`font-bold ${theme.primary}`}>{header}</span>
        <span className={theme.muted}>POLYGON</span>
      </div>

      <div className={`grid grid-cols-2 gap-2 ${theme.text} font-mono`}>
        <div>
          <div className={`text-[10px] ${theme.muted}`}>AMOUNT</div>
          <div className={`text-base font-bold ${theme.primary} tabular-nums`}>
            {isRevoke ? "0 (revoke)" : human}{" "}
            {kind === "wrap" ? "USDC.e" : kind === "unwrap" ? "pUSD" : "pUSD"}
          </div>
        </div>
        <div>
          <div className={`text-[10px] ${theme.muted}`}>
            {kind === "approve" ? "SPENDER" : kind === "wrap" ? "ONRAMP" : "OFFRAMP"}
          </div>
          <div className="tabular-nums">
            {kind === "approve" && spender
              ? truncateAddr(spender)
              : kind === "wrap"
                ? "CollateralOnramp"
                : "CollateralOfframp"}
          </div>
        </div>
      </div>

      <div className={`text-[11px] ${theme.muted} border-t ${theme.border} pt-2`}>
        {kind === "wrap" &&
          `USDC.e (${truncateAddr(POLY_USDCE)}) → pUSD. Never wraps native USDC. Exact amount. POL gas.`}
        {kind === "unwrap" && `pUSD → USDC.e. Exact amount. POL gas.`}
        {kind === "approve" &&
          (isRevoke
            ? `Revoking pUSD allowance. Never infinite approve.`
            : `Exact pUSD allowance. Revoke with \`poly approve 0\`.`)}
      </div>

      {errorMsg && <div className={`p-2 border rounded ${theme.warn}`}>ERROR: {errorMsg}</div>}

      {status === "success" && txHash && (
        <div
          className={`p-2 border ${theme.border} ${theme.cardBg} ${theme.primary} ${theme.rounded} space-y-1`}
        >
          <div className="font-bold">[✓] CONFIRMED ON-CHAIN</div>
          <div className="text-[10px] truncate">TX: {txHash}</div>
          {blockExplorer && (
            <a
              href={`${blockExplorer}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className={`text-[10px] underline hover:opacity-80 block ${theme.primary}`}
            >
              View on Polygon Explorer ↗
            </a>
          )}
        </div>
      )}

      <div className="pt-2">
        {busy && (
          <div className={`${theme.warn} font-bold animate-pulse`}>
            {status.startsWith("waiting")
              ? "WAITING FOR CONFIRMATION..."
              : "SIGN IN WALLET..."}
          </div>
        )}
        {!busy && status !== "success" && (
          <button
            onClick={run}
            className={`px-4 py-1.5 border ${theme.border} bg-current/30 hover:bg-current/50 ${theme.primary} font-bold ${theme.rounded} cursor-pointer ${theme.glow} transition-all`}
          >
            {kind === "wrap"
              ? needApproveAsset
                ? "[ STEP 1/2: APPROVE USDC.e ]"
                : "[ STEP 2/2: WRAP ]"
              : kind === "unwrap"
                ? needApproveAsset
                  ? "[ STEP 1/2: APPROVE pUSD ]"
                  : "[ STEP 2/2: UNWRAP ]"
                : isRevoke
                  ? "[ REVOKE ]"
                  : "[ APPROVE pUSD ]"}
          </button>
        )}
      </div>
    </div>
  );
}
