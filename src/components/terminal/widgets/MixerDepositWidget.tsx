/**
 * @file MixerDepositWidget.tsx
 * @description Mixer deposit confirm — SwapWidget STEP chrome (not pinnable) #111
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useEffect, useState } from "react";
import {
  usePublicClient,
  useSendTransaction,
  useWriteContract
} from "wagmi";
import {
  encodeFunctionData,
  type Address,
  type Chain
} from "viem";
import type { ThemeConfig } from "../types";
import {
  MIXER_LEGAL_FOOTER,
  MIXER_PRIVACY_WARN,
  MIXER_ERROR_COPY,
  mixerPoolAbi,
  erc20MixerAbi,
  truncateHex,
  type MixerPool
} from "../mixer/constants";
import { ackPrivacyWarn } from "../mixer/privacy";
import { formatViemError } from "../../../lib/viemError";

type Status =
  | "checking_approval"
  | "needs_approval"
  | "approving"
  | "waiting_approval_confirmation"
  | "ready"
  | "depositing"
  | "waiting_deposit"
  | "success"
  | "error"
  | "cancelled";

export default function MixerDepositWidget({
  theme,
  targetChain,
  userAddress,
  pool,
  commitment,
  noteId,
  showPrivacyWarn,
  ownerKey
}: {
  theme: ThemeConfig;
  targetChain: Chain;
  userAddress: Address;
  pool: MixerPool;
  commitment: `0x${string}`;
  noteId: string;
  showPrivacyWarn: boolean;
  ownerKey: string;
}) {
  const isNative = pool.tokenAddress == null;
  const [status, setStatus] = useState<Status>(
    isNative ? "ready" : "checking_approval"
  );
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [privacyVisible, setPrivacyVisible] = useState(showPrivacyWarn);

  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  useEffect(() => {
    async function check() {
      if (isNative || !publicClient || !pool.tokenAddress) {
        setStatus("ready");
        return;
      }
      try {
        const allowance = (await publicClient.readContract({
          address: pool.tokenAddress,
          abi: erc20MixerAbi,
          functionName: "allowance",
          args: [userAddress, pool.address]
        })) as bigint;
        setStatus(
          allowance >= pool.denominationWei ? "ready" : "needs_approval"
        );
      } catch {
        setStatus("ready");
      }
    }
    check();
  }, [
    isNative,
    publicClient,
    pool.tokenAddress,
    pool.address,
    pool.denominationWei,
    userAddress
  ]);

  const handleCancel = () => {
    setStatus("cancelled");
    setErrorMsg(MIXER_ERROR_COPY.MIXER_USER_REJECT);
  };

  const handleApprove = async () => {
    if (!pool.tokenAddress) return;
    setStatus("approving");
    setErrorMsg(null);
    try {
      const hash = await writeContractAsync({
        chainId: targetChain.id,
        address: pool.tokenAddress,
        abi: erc20MixerAbi,
        functionName: "approve",
        args: [pool.address, pool.denominationWei]
      });
      setStatus("waiting_approval_confirmation");
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          setStatus("error");
          setErrorMsg("Approval reverted.");
          return;
        }
      }
      setStatus("ready");
    } catch (err: unknown) {
      setStatus("needs_approval");
      setErrorMsg(formatViemError(err) || "Approval rejected or failed.");
    }
  };

  const handleDeposit = async () => {
    if (privacyVisible) {
      ackPrivacyWarn(ownerKey);
      setPrivacyVisible(false);
    }
    setStatus("depositing");
    setErrorMsg(null);
    try {
      const data = encodeFunctionData({
        abi: mixerPoolAbi,
        functionName: "deposit",
        args: [commitment]
      });
      const hash = await sendTransactionAsync({
        chainId: targetChain.id,
        to: pool.address,
        data,
        value: isNative ? pool.denominationWei : 0n
      });
      setTxHash(hash);
      setStatus("waiting_deposit");
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          setStatus("error");
          setErrorMsg(MIXER_ERROR_COPY.MIXER_DEPOSIT_REVERT);
          return;
        }
      }
      setStatus("success");
    } catch (err: unknown) {
      const msg = formatViemError(err);
      if (/user rejected|denied|cancelled/i.test(msg)) {
        setStatus("cancelled");
        setErrorMsg(MIXER_ERROR_COPY.MIXER_USER_REJECT);
      } else {
        setStatus("error");
        setErrorMsg(msg);
      }
    }
  };

  const explorer =
    txHash && targetChain.blockExplorers?.default?.url
      ? `${targetChain.blockExplorers.default.url}/tx/${txHash}`
      : null;

  return (
    <div
      className={`relative my-3 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} max-w-md ${theme.text} text-xs`}
    >
      <div
        className={`flex justify-between border-b ${theme.border} pb-1 mb-2 text-[10px] tracking-wider`}
      >
        <span className={`font-bold ${theme.primary}`}>MIXER DEPOSIT</span>
        <span className={theme.muted}>
          {targetChain.name?.toUpperCase()} · {pool.denomination} {pool.token}
        </span>
      </div>

      {privacyVisible && (
        <div className={`mb-2 p-2 border ${theme.border} ${theme.warn} text-[10px]`}>
          {MIXER_PRIVACY_WARN}
        </div>
      )}

      <div className="space-y-1 text-[10px]">
        <div>
          <span className={theme.muted}>POOL </span>
          <span className="font-mono">{truncateHex(pool.address)}</span>
        </div>
        <div>
          <span className={theme.muted}>DENOM </span>
          <span className="tabular-nums">
            {pool.denomination} {pool.token}
          </span>
        </div>
        <div>
          <span className={theme.muted}>COMMITMENT </span>
          <span className="font-mono">{noteId}</span>
        </div>
        <div>
          <span className={theme.muted}>NOTE </span>
          <span className={theme.primary}>encrypted</span>
        </div>
        {!isNative && (
          <div>
            <span className={theme.muted}>APPROVE </span>
            <span>
              {status === "needs_approval" || status === "approving"
                ? "needed"
                : "ok"}
            </span>
          </div>
        )}
      </div>

      {status === "cancelled" && (
        <div className={`mt-2 ${theme.warn}`}>
          {MIXER_ERROR_COPY.MIXER_USER_REJECT}
        </div>
      )}
      {errorMsg && status !== "cancelled" && (
        <div className={`mt-2 ${theme.warn}`}>{errorMsg}</div>
      )}
      {status === "success" && (
        <div className={`mt-2 space-y-1 ${theme.primary}`}>
          <div>Deposit confirmed.</div>
          {txHash && (
            <div className="font-mono break-all text-[10px]">
              {truncateHex(txHash, 8, 6)}
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
          <div className={theme.muted}>
            Note saved encrypted. Withdraw needs this note + a fresh recipient.
          </div>
          <div className={theme.muted}>{MIXER_LEGAL_FOOTER}</div>
        </div>
      )}

      {status !== "success" && status !== "cancelled" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!isNative &&
            (status === "needs_approval" ||
              status === "approving" ||
              status === "waiting_approval_confirmation") && (
              <button
                type="button"
                disabled={
                  status === "approving" ||
                  status === "waiting_approval_confirmation"
                }
                className={`px-3 py-1 border ${theme.border} ${theme.primary} font-bold text-[10px] ${touch}`}
                onClick={handleApprove}
              >
                {status === "approving" ||
                status === "waiting_approval_confirmation"
                  ? "[ STEP 1/2: APPROVING… ]"
                  : "[ STEP 1/2: APPROVE ]"}
              </button>
            )}
          {(status === "ready" ||
            status === "depositing" ||
            status === "waiting_deposit" ||
            status === "error") && (
            <button
              type="button"
              disabled={
                status === "depositing" || status === "waiting_deposit"
              }
              className={`px-3 py-1 border ${theme.border} ${theme.primary} font-bold text-[10px] ${touch}`}
              onClick={handleDeposit}
            >
              {status === "depositing" || status === "waiting_deposit"
                ? isNative
                  ? "DEPOSITING…"
                  : "[ STEP 2/2: DEPOSITING… ]"
                : isNative
                  ? "DEPOSIT"
                  : "[ STEP 2/2: DEPOSIT ]"}
            </button>
          )}
          <button
            type="button"
            disabled={
              status === "depositing" ||
              status === "waiting_deposit" ||
              status === "approving"
            }
            className={`px-3 py-1 border ${theme.border} ${theme.muted} text-[10px] ${touch}`}
            onClick={handleCancel}
          >
            CANCEL
          </button>
        </div>
      )}
    </div>
  );
}
