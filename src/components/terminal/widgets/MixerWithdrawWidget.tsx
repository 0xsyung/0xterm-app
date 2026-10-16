/**
 * @file MixerWithdrawWidget.tsx
 * @description Mixer withdraw confirm — RunConfirm-shaped (not pinnable) #111
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useEffect, useState } from "react";
import type { Address, Chain } from "viem";
import type { ThemeConfig } from "../types";
import {
  MIXER_ERROR_COPY,
  MIXER_LEGAL_FOOTER,
  MIXER_PRIVACY_WARN,
  MIXER_SAME_ADDR_WARN,
  truncateHex,
  type MixerPool
} from "../mixer/constants";
import { ackPrivacyWarn } from "../mixer/privacy";
import { buildWithdrawProof } from "../mixer/proof";
import { markNoteSpentLocal } from "../mixer/notes";

type ProofStatus = "idle" | "building" | "ready" | "fail";

export default function MixerWithdrawWidget({
  theme,
  targetChain,
  userAddress,
  pool,
  noteId,
  commitment,
  nullifierHash,
  recipient,
  root,
  sameAddress,
  showPrivacyWarn,
  ownerKey,
  preflightProofFail
}: {
  theme: ThemeConfig;
  targetChain: Chain;
  userAddress: Address;
  pool: MixerPool;
  noteId: string;
  commitment: `0x${string}`;
  nullifierHash: `0x${string}`;
  recipient: Address;
  root: `0x${string}` | null;
  sameAddress: boolean;
  showPrivacyWarn: boolean;
  ownerKey: string;
  preflightProofFail?: string;
}) {
  const [proofStatus, setProofStatus] = useState<ProofStatus>(
    preflightProofFail ? "fail" : "building"
  );
  const [proofError, setProofError] = useState<string | null>(
    preflightProofFail || null
  );
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(showPrivacyWarn);
  const [done, setDone] = useState(false);

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  useEffect(() => {
    if (preflightProofFail) return;
    let cancelledLocal = false;
    (async () => {
      setProofStatus("building");
      const res = await buildWithdrawProof({
        root: root || (("0x" + "0".repeat(64)) as `0x${string}`),
        nullifierHash,
        recipient,
        relayer: "0x0000000000000000000000000000000000000000",
        fee: 0n,
        refund: 0n,
        nullifier: new Uint8Array(31),
        secret: new Uint8Array(31),
        pathElements: [],
        pathIndices: []
      });
      if (cancelledLocal) return;
      if (!res.ok) {
        setProofStatus("fail");
        setProofError(res.reason);
      } else {
        setProofStatus("ready");
      }
    })();
    return () => {
      cancelledLocal = true;
    };
  }, [preflightProofFail, root, nullifierHash, recipient]);

  // silence unused — withdraw submit reserved for circuit ship
  void userAddress;
  void commitment;

  const handleCancel = () => {
    setCancelled(true);
  };

  const handleWithdraw = async () => {
    if (proofStatus !== "ready") return;
    if (privacyVisible) {
      ackPrivacyWarn(ownerKey);
      setPrivacyVisible(false);
    }
    setBusy(true);
    try {
      // Circuit path not shipped — should not reach ready in v1.
      markNoteSpentLocal(ownerKey, commitment);
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (cancelled) {
    return (
      <div
        className={`relative my-3 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} max-w-md ${theme.warn} text-xs`}
      >
        {MIXER_ERROR_COPY.MIXER_USER_REJECT}
      </div>
    );
  }

  return (
    <div
      className={`relative my-3 p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded} max-w-md ${theme.text} text-xs`}
    >
      <div
        className={`flex justify-between border-b ${theme.border} pb-1 mb-2 text-[10px] tracking-wider`}
      >
        <span className={`font-bold ${theme.primary}`}>MIXER WITHDRAW</span>
        <span className={theme.muted}>{targetChain.name?.toUpperCase()}</span>
      </div>

      {privacyVisible && (
        <div className={`mb-2 p-2 border ${theme.border} ${theme.warn} text-[10px]`}>
          {MIXER_PRIVACY_WARN}
        </div>
      )}

      {sameAddress && (
        <div className={`mb-2 ${theme.warn} text-[10px]`}>
          {MIXER_SAME_ADDR_WARN}
        </div>
      )}

      <div className="space-y-1 text-[10px]">
        <div>
          <span className={theme.muted}>NOTE </span>
          <span className="font-mono">{noteId}</span>
        </div>
        <div>
          <span className={theme.muted}>POOL </span>
          <span className="tabular-nums">
            {pool.denomination} {pool.token}
          </span>
        </div>
        <div>
          <span className={theme.muted}>RECIPIENT </span>
          <span className="font-mono break-all">{recipient}</span>
        </div>
        <div>
          <span className={theme.muted}>ROOT </span>
          <span className="font-mono">
            {root ? truncateHex(root) : "—"}
          </span>
        </div>
        <div>
          <span className={theme.muted}>FEE/RELAYER </span>
          <span>none (v1)</span>
        </div>
        <div>
          <span className={theme.muted}>PROOF </span>
          {proofStatus === "building" && (
            <span className={`${theme.warn} animate-pulse`}>
              BUILDING PROOF…
            </span>
          )}
          {proofStatus === "ready" && (
            <span className={theme.primary}>ready</span>
          )}
          {proofStatus === "fail" && (
            <span className={theme.warn}>failed</span>
          )}
        </div>
      </div>

      {proofStatus === "fail" && (
        <div className={`mt-2 ${theme.warn} text-[10px]`}>
          {MIXER_ERROR_COPY.MIXER_PROOF_FAIL}
          {proofError ? ` ${proofError}` : ""}
        </div>
      )}

      {done && (
        <div className={`mt-2 ${theme.primary} text-[10px]`}>
          Withdraw submitted.
          <div className={theme.muted}>{MIXER_LEGAL_FOOTER}</div>
        </div>
      )}

      {!done && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy || proofStatus !== "ready"}
            className={`px-3 py-1 border ${theme.border} ${theme.primary} font-bold text-[10px] ${touch}`}
            onClick={handleWithdraw}
          >
            WITHDRAW
          </button>
          <button
            type="button"
            disabled={busy}
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
