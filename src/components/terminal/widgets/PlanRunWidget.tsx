/**
 * @file PlanRunWidget.tsx
 * @description Step-by-step plan run — rebuild, drift, optional Multicall3 pack (#24/#242)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatUnits,
  getAddress,
  type Address,
  type Chain,
  type Hex,
  type PublicClient
} from "viem";
import { useSendTransaction } from "wagmi";
import type { ThemeConfig } from "../types";
import type { Plan, PlanStep } from "../plan/types";
import { planErrorLine, sanitizePlanErr } from "../plan/errors";
import { stepSummary } from "../plan/summary";
import { PLAN_WARN_BANNER } from "../plan/constants";
import { rebuildSwapCalldata } from "../plan/swapRebuild";
import { rebuildVaultCalldata } from "../plan/vaultRebuild";
import { encodeApproveStep } from "../plan/approveEncode";
import { polyBookDrift } from "../plan/drift";
import {
  buildMulticallTx,
  collectEligiblePack,
  ineligibleReason,
  multicall3ForChain,
  packCallSummary,
  packCallsDrifted,
  packConfirmCopy,
  PACK_INELIGIBLE_COPY,
  truncateAddr,
  type PackCall,
  type PackIneligibleReason
} from "../plan/multicall";
import SwapWidget from "../SwapWidget";
import VaultDepositWidget from "./VaultDepositWidget";
import VaultApproveWidget from "./VaultApproveWidget";
import PolyTradeWidget from "./PolyTradeWidget";
import PolyCollateralWidget from "./PolyCollateralWidget";
import { fetchVaultAsset } from "../vault";
import { SUPPORTED_CHAINS } from "../constants";
import { POLY_CTF_EXCHANGE, fetchBook, midpointFromBook } from "../poly";
import PinButton from "./PinButton";

type Phase =
  | "idle"
  | "rebuilding"
  | "confirm"
  | "pack_confirm"
  | "waiting"
  | "advance"
  | "done"
  | "aborted";

type PackBuilt = {
  kind: "multicall";
  chainId: number;
  targetChain: Chain;
  to: Address;
  data: Hex;
  value: 0n;
  calls: PackCall[];
  indices: number[];
  gasEstimate: bigint | null;
  fallbackNote: string | null;
};

export default function PlanRunWidget({
  theme,
  plan: planProp,
  userAddress,
  activeChainId,
  chainObj,
  client,
  multicall = false,
  onPlansUpdate,
  onSessionEnd,
  onPin
}: {
  theme: ThemeConfig;
  plan: Plan;
  userAddress: Address;
  activeChainId: number | null;
  chainObj: Chain | null;
  client: PublicClient | null;
  /** Opt-in same-chain Multicall3 pack (#242). Default = per-step. */
  multicall?: boolean;
  onPlansUpdate: (plan: Plan) => void;
  onSessionEnd: () => void;
  onPin?: () => void;
}) {
  const [plan, setPlan] = useState(planProp);
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [built, setBuilt] = useState<any>(null);
  const [packBuilt, setPackBuilt] = useState<PackBuilt | null>(null);
  const { sendTransactionAsync } = useSendTransaction();

  const pendingIdx = useMemo(
    () => plan.steps.findIndex((s) => s.status === "pending"),
    [plan.steps]
  );
  const step: PlanStep | null =
    pendingIdx >= 0 ? plan.steps[pendingIdx]! : null;

  const patchStep = useCallback(
    (idx: number, patch: Partial<PlanStep>) => {
      setPlan((prev) => {
        const steps = prev.steps.map((s, i) =>
          i === idx ? ({ ...s, ...patch } as PlanStep) : s
        );
        const next = { ...prev, steps, updatedAt: Date.now() };
        onPlansUpdate(next);
        return next;
      });
    },
    [onPlansUpdate]
  );

  const patchSteps = useCallback(
    (indices: number[], patch: Partial<PlanStep>) => {
      setPlan((prev) => {
        const steps = prev.steps.map((s, i) =>
          indices.includes(i) ? ({ ...s, ...patch } as PlanStep) : s
        );
        const next = { ...prev, steps, updatedAt: Date.now() };
        onPlansUpdate(next);
        return next;
      });
    },
    [onPlansUpdate]
  );

  const abortRest = useCallback(
    (
      idx: number,
      reason: string,
      code:
        | "PLAN_DRIFT"
        | "PLAN_USER_REJECT"
        | "PLAN_STEP_REVERT"
        | "PLAN_WRONG_CHAIN"
        | "PLAN_STALE_DEX"
        | "PLAN_PACK_REFUSE" = "PLAN_DRIFT"
    ) => {
      patchStep(idx, {
        lastSim: { at: Date.now(), ok: false, reason }
      });
      setMsg(planErrorLine(code, reason));
      setPhase("aborted");
      onSessionEnd();
    },
    [patchStep, onSessionEnd]
  );

  const rebuildOneCall = async (
    s: PlanStep,
    idx: number
  ): Promise<PackCall | { ineligible: PackIneligibleReason }> => {
    if (!client) throw new Error("No RPC client.");
    const why = ineligibleReason(s);
    if (why) return { ineligible: why };

    if (s.kind === "approve") {
      const encoded = encodeApproveStep(s);
      const value = BigInt(encoded.value);
      const post = ineligibleReason(s, { rebuiltValue: value });
      if (post) return { ineligible: post };
      try {
        await client.call({
          to: encoded.to,
          data: encoded.data,
          account: userAddress
        });
      } catch (e) {
        throw new Error(sanitizePlanErr(e));
      }
      return {
        target: encoded.to,
        allowFailure: false,
        callData: encoded.data,
        value: 0n,
        stepIndex: idx,
        kind: s.kind,
        summary: packCallSummary(s, 0n)
      };
    }

    if (s.kind === "swap") {
      const result = await rebuildSwapCalldata(s, userAddress, client);
      const value = BigInt(result.value);
      const post = ineligibleReason(s, { rebuiltValue: value });
      if (post) return { ineligible: post };
      return {
        target: result.router,
        allowFailure: false,
        callData: result.data,
        value: 0n,
        stepIndex: idx,
        kind: s.kind,
        summary: packCallSummary(s, 0n)
      };
    }

    if (s.kind === "vault") {
      const result = await rebuildVaultCalldata(s, userAddress, client);
      const value = BigInt(result.value);
      const post = ineligibleReason(s, { rebuiltValue: value });
      if (post) return { ineligible: post };
      return {
        target: result.to,
        allowFailure: false,
        callData: result.data,
        value: 0n,
        stepIndex: idx,
        kind: s.kind,
        summary: packCallSummary(s, 0n)
      };
    }

    return { ineligible: "unsupported_kind" };
  };

  const tryStartPack = async (): Promise<boolean> => {
    if (!multicall || !step || pendingIdx < 0 || !client) return false;

    const collected = collectEligiblePack(plan.steps, pendingIdx);
    let indices = collected.indices;
    let chainId = collected.chainId;
    let fallbackNote: string | null = null;

    if (collected.breakReason && collected.breakIndex != null) {
      fallbackNote = PACK_INELIGIBLE_COPY[collected.breakReason];
    }

    // Current step itself ineligible → per-step with explicit copy (never silent skip).
    if (indices.length === 0) {
      const why =
        collected.breakReason ||
        ineligibleReason(step) ||
        "unsupported_kind";
      setMsg(
        `${PACK_INELIGIBLE_COPY[why]} Not packing — per-step confirm for step ${pendingIdx + 1}.`
      );
      return false;
    }

    // Only one eligible → per-step (packing N=1 is pointless).
    if (indices.length < 2) {
      if (fallbackNote) {
        setMsg(
          `${fallbackNote} Pack size 1 — using per-step confirm (one wallet confirm for N same-chain calls needs N≥2).`
        );
      }
      return false;
    }

    // Wrong chain → ask; no silent auto-switch.
    if (activeChainId != null && chainId != null && activeChainId !== chainId) {
      abortRest(
        pendingIdx,
        `pack chain ${chainId} ≠ active ${activeChainId}`,
        "PLAN_WRONG_CHAIN"
      );
      return true; // handled (aborted)
    }

    if (!chainId || !multicall3ForChain(chainId)) {
      setMsg(
        `${PACK_INELIGIBLE_COPY.no_multicall3} Per-step confirm.`
      );
      return false;
    }

    const targetChain =
      SUPPORTED_CHAINS.find((c) => c.id === chainId) || chainObj;
    if (!targetChain) {
      abortRest(pendingIdx, "unknown chain", "PLAN_WRONG_CHAIN");
      return true;
    }

    setPhase("rebuilding");
    setMsg(
      `Rebuilding pack of ${indices.length} same-chain steps (${packConfirmCopy(indices.length)})…`
    );

    const calls: PackCall[] = [];
    for (const idx of indices) {
      const s = plan.steps[idx]!;
      try {
        const rebuilt = await rebuildOneCall(s, idx);
        if ("ineligible" in rebuilt) {
          // Shrink pack to calls before this index; if none left usable, fall back.
          if (calls.length >= 2) {
            fallbackNote = PACK_INELIGIBLE_COPY[rebuilt.ineligible];
            indices = calls.map((c) => c.stepIndex);
            break;
          }
          setMsg(
            `${PACK_INELIGIBLE_COPY[rebuilt.ineligible]} Per-step confirm for step ${idx + 1}.`
          );
          return false;
        }
        calls.push(rebuilt);
        patchStep(idx, { lastSim: { at: Date.now(), ok: true } });
      } catch (e) {
        abortRest(
          idx,
          sanitizePlanErr(e).replace(/^\[!\]\s*\w+\s*—\s*/, ""),
          "PLAN_DRIFT"
        );
        return true;
      }
    }

    if (calls.length < 2) {
      setMsg(
        `${fallbackNote || "Pack shrunk below 2."} Per-step confirm.`
      );
      return false;
    }

    let tx;
    try {
      tx = buildMulticallTx(chainId, calls);
    } catch (e) {
      setMsg(`${sanitizePlanErr(e)} Per-step confirm.`);
      return false;
    }

    let gasEstimate: bigint | null = null;
    try {
      gasEstimate = await client.estimateGas({
        account: userAddress,
        to: tx.to,
        data: tx.data,
        value: 0n
      });
    } catch {
      gasEstimate = null;
    }

    setPackBuilt({
      kind: "multicall",
      chainId,
      targetChain,
      to: tx.to,
      data: tx.data,
      value: 0n,
      calls,
      indices: calls.map((c) => c.stepIndex),
      gasEstimate,
      fallbackNote
    });
    setBuilt(null);
    setMsg(
      `Pack ready — ${packConfirmCopy(calls.length)}. Re-sim ok; confirm to send.`
    );
    setPhase("pack_confirm");
    return true;
  };

  const startStep = useCallback(async () => {
    if (!step || pendingIdx < 0) {
      setPhase("done");
      setMsg("[✓] Plan complete — no pending steps.");
      onSessionEnd();
      return;
    }
    if (!client) {
      setMsg(planErrorLine("PLAN_NEED_WALLET", "No RPC client."));
      setPhase("aborted");
      onSessionEnd();
      return;
    }
    setPhase("rebuilding");
    setMsg(`Rebuilding step ${pendingIdx + 1}: ${stepSummary(step)}`);
    setBuilt(null);
    setPackBuilt(null);

    try {
      if (multicall) {
        const handled = await tryStartPack();
        if (handled) return;
        // fall through to per-step for ineligible / N<2
      }

      const stepChain =
        step.kind === "poly-wrap" || step.kind === "poly-unwrap"
          ? 137
          : "chainId" in step
            ? step.chainId
            : null;
      if (
        stepChain != null &&
        activeChainId != null &&
        stepChain !== activeChainId
      ) {
        abortRest(
          pendingIdx,
          `step chain ${stepChain} ≠ active ${activeChainId}`,
          "PLAN_WRONG_CHAIN"
        );
        return;
      }

      if (step.kind === "swap") {
        const result = await rebuildSwapCalldata(step, userAddress, client);
        const targetChain =
          SUPPORTED_CHAINS.find((c) => c.id === step.chainId) || chainObj;
        if (!targetChain) {
          abortRest(pendingIdx, "unknown chain", "PLAN_WRONG_CHAIN");
          return;
        }
        patchStep(pendingIdx, {
          lastSim: { at: Date.now(), ok: true }
        });
        setBuilt({
          kind: "swap",
          result,
          targetChain,
          step
        });
        setPhase("confirm");
        return;
      }

      if (step.kind === "vault") {
        const result = await rebuildVaultCalldata(step, userAddress, client);
        const asset = await fetchVaultAsset(client, step.vault as Address);
        const targetChain =
          SUPPORTED_CHAINS.find((c) => c.id === step.chainId) || chainObj;
        if (!targetChain || !asset) {
          abortRest(pendingIdx, "vault asset/chain unavailable", "PLAN_DRIFT");
          return;
        }
        patchStep(pendingIdx, {
          lastSim: { at: Date.now(), ok: true }
        });
        setBuilt({ kind: "vault", result, asset, targetChain, step });
        setPhase("confirm");
        return;
      }

      if (step.kind === "approve") {
        const encoded = encodeApproveStep(step);
        const targetChain =
          SUPPORTED_CHAINS.find((c) => c.id === step.chainId) || chainObj;
        if (!targetChain) {
          abortRest(pendingIdx, "unknown chain", "PLAN_WRONG_CHAIN");
          return;
        }
        try {
          await client.call({
            to: encoded.to,
            data: encoded.data,
            account: userAddress
          });
        } catch (e) {
          abortRest(pendingIdx, sanitizePlanErr(e), "PLAN_DRIFT");
          return;
        }
        patchStep(pendingIdx, {
          lastSim: { at: Date.now(), ok: true }
        });
        setBuilt({ kind: "approve", encoded, targetChain, step });
        setPhase("confirm");
        return;
      }

      if (step.kind === "poly") {
        if (multicall) {
          setMsg(
            `${PACK_INELIGIBLE_COPY.poly_eip712} Per-step confirm for step ${pendingIdx + 1}.`
          );
        }
        let book;
        try {
          book = await fetchBook(step.tokenId);
        } catch (e) {
          abortRest(pendingIdx, sanitizePlanErr(e), "PLAN_DRIFT");
          return;
        }
        const mid =
          midpointFromBook(book.bestBid, book.bestAsk) ??
          Number(step.bookAtAdd.mid);
        const drift = polyBookDrift(step, mid);
        if (!drift.ok) {
          abortRest(pendingIdx, drift.reason, "PLAN_DRIFT");
          return;
        }
        const targetChain =
          SUPPORTED_CHAINS.find((c) => c.id === 137) || chainObj;
        if (!targetChain) {
          abortRest(pendingIdx, "polygon required", "PLAN_WRONG_CHAIN");
          return;
        }
        patchStep(pendingIdx, {
          lastSim: { at: Date.now(), ok: true }
        });
        setBuilt({
          kind: "poly",
          step,
          targetChain,
          mid,
          tick: Number(step.bookAtAdd.tick) || book.tickSize || 0.01,
          minSize: Number(step.bookAtAdd.minSize) || book.minOrderSize || 1,
          negRisk: !!book.negRisk
        });
        setPhase("confirm");
        return;
      }

      if (step.kind === "poly-wrap" || step.kind === "poly-unwrap") {
        if (multicall) {
          setMsg(
            `${PACK_INELIGIBLE_COPY.poly_wrap} Per-step confirm for step ${pendingIdx + 1}.`
          );
        }
        const targetChain =
          SUPPORTED_CHAINS.find((c) => c.id === 137) || chainObj;
        if (!targetChain) {
          abortRest(pendingIdx, "polygon required", "PLAN_WRONG_CHAIN");
          return;
        }
        patchStep(pendingIdx, {
          lastSim: { at: Date.now(), ok: true }
        });
        setBuilt({
          kind: "wrap",
          step,
          targetChain,
          wrapKind: step.kind === "poly-wrap" ? "wrap" : "unwrap"
        });
        setPhase("confirm");
        return;
      }

      abortRest(pendingIdx, `unsupported kind`, "PLAN_DRIFT");
    } catch (e) {
      const err = sanitizePlanErr(e);
      const code = /PLAN_STALE_DEX/.test(err)
        ? "PLAN_STALE_DEX"
        : /PLAN_DRIFT|drift/i.test(err)
          ? "PLAN_DRIFT"
          : "PLAN_DRIFT";
      abortRest(pendingIdx, err.replace(/^\[!\]\s*\w+\s*—\s*/, ""), code as "PLAN_DRIFT");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    pendingIdx,
    client,
    userAddress,
    activeChainId,
    chainObj,
    abortRest,
    patchStep,
    onSessionEnd,
    multicall,
    plan.steps
  ]);

  useEffect(() => {
    if (phase === "idle" || phase === "advance") {
      void startStep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, plan.steps.map((s) => s.status).join(",")]);

  const onStepSuccess = (txHash?: string, orderId?: string) => {
    if (pendingIdx < 0) return;
    patchStep(pendingIdx, {
      status: "done",
      txHash,
      orderId,
      lastSim: { at: Date.now(), ok: true }
    });
    setBuilt(null);
    setPackBuilt(null);
    setPhase("advance");
  };

  const onStepReject = () => {
    if (pendingIdx < 0) return;
    abortRest(pendingIdx, "wallet rejected", "PLAN_USER_REJECT");
  };

  const onStepRevert = () => {
    if (pendingIdx < 0) return;
    abortRest(pendingIdx, "tx reverted / CLOB reject", "PLAN_STEP_REVERT");
  };

  const onPackConfirm = async () => {
    if (!packBuilt || !client) return;
    // Re-sim every packed step again immediately before send — any drift aborts.
    setPhase("rebuilding");
    setMsg("Re-sim pack before send…");
    try {
      const fresh: PackCall[] = [];
      for (const idx of packBuilt.indices) {
        const s = plan.steps[idx]!;
        const rebuilt = await rebuildOneCall(s, idx);
        if ("ineligible" in rebuilt) {
          abortRest(
            idx,
            PACK_INELIGIBLE_COPY[rebuilt.ineligible],
            "PLAN_DRIFT"
          );
          return;
        }
        fresh.push(rebuilt);
      }
      const drift = packCallsDrifted(packBuilt.calls, fresh);
      if (drift.drifted) {
        abortRest(drift.stepIndex, drift.reason, "PLAN_DRIFT");
        return;
      }
      const tx = buildMulticallTx(packBuilt.chainId, fresh);
      setPhase("waiting");
      setMsg("Waiting for wallet confirm (one tx for pack)…");
      const hash = await sendTransactionAsync({
        chainId: packBuilt.chainId,
        to: tx.to,
        data: tx.data,
        value: 0n
      });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        abortRest(
          packBuilt.indices[0]!,
          "multicall pack reverted",
          "PLAN_STEP_REVERT"
        );
        return;
      }
      patchSteps(packBuilt.indices, {
        status: "done",
        txHash: hash,
        lastSim: { at: Date.now(), ok: true }
      });
      setPackBuilt(null);
      setBuilt(null);
      setMsg(`[✓] Pack of ${packBuilt.indices.length} sent — ${hash.slice(0, 10)}…`);
      setPhase("advance");
    } catch (e) {
      const err = sanitizePlanErr(e);
      if (/PLAN_USER_REJECT|user rejected|denied|cancelled/i.test(err)) {
        abortRest(
          packBuilt.indices[0]!,
          "wallet rejected",
          "PLAN_USER_REJECT"
        );
        return;
      }
      abortRest(
        packBuilt.indices[0]!,
        err.replace(/^\[!\]\s*\w+\s*—\s*/, ""),
        "PLAN_STEP_REVERT"
      );
    }
  };

  const onPackReject = () => {
    if (!packBuilt) return;
    abortRest(packBuilt.indices[0]!, "wallet rejected", "PLAN_USER_REJECT");
  };

  const checksumTo = packBuilt
    ? getAddress(packBuilt.to)
    : null;

  return (
    <div
      className={`relative text-xs space-y-2 my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow || ""} w-full ${theme.text}`}
    >
      <div
        className={`flex justify-between items-center border-b ${theme.border} pb-1`}
      >
        <span className={`font-bold ${theme.primary} tracking-wider`}>
          PLAN RUN {plan.name}
          {multicall ? " · MULTICALL" : ""}
        </span>
        <PinButton onPin={onPin} theme={theme} />
      </div>
      <div className={`p-2 border ${theme.border} ${theme.warn} ${theme.rounded}`}>
        {PLAN_WARN_BANNER}
      </div>
      {msg && (
        <div
          className={`p-2 border ${theme.border} ${theme.rounded} ${
            phase === "aborted" ? theme.warn : theme.muted
          }`}
        >
          {msg}
        </div>
      )}

      {phase === "pack_confirm" && packBuilt && checksumTo && (
        <div
          className={`space-y-2 p-3 border ${theme.border} ${theme.rounded}`}
        >
          <div className={`font-bold ${theme.primary}`}>
            Pack confirm — {packConfirmCopy(packBuilt.calls.length)}
          </div>
          <div className={`${theme.muted}`}>
            <span className="tabular-nums">N={packBuilt.calls.length}</span>
            {" · "}
            chain{" "}
            <span className="tabular-nums">{packBuilt.chainId}</span>
            {" · "}
            multicall to{" "}
            <button
              type="button"
              className={`normal-case underline ${theme.primary}`}
              title={checksumTo}
              onClick={() => {
                void navigator.clipboard?.writeText(checksumTo);
              }}
            >
              {truncateAddr(checksumTo)}
            </button>
          </div>
          <ol className="list-decimal list-inside space-y-1">
            {packBuilt.calls.map((c, i) => (
              <li key={`${c.stepIndex}-${i}`} className="tabular-nums">
                <span className={theme.primary}>{c.kind}</span>
                {" · "}
                {c.summary}
              </li>
            ))}
          </ol>
          <div className={`${theme.muted} tabular-nums`}>
            estimated gas:{" "}
            {packBuilt.gasEstimate != null
              ? packBuilt.gasEstimate.toString()
              : "—"}
          </div>
          {packBuilt.fallbackNote && (
            <div className={`${theme.warn} text-[10px]`}>
              Later steps out of pack: {packBuilt.fallbackNote}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className={`px-3 py-1 border ${theme.border} ${theme.primary} ${theme.rounded}`}
              onClick={() => void onPackConfirm()}
            >
              Confirm pack
            </button>
            <button
              type="button"
              className={`px-3 py-1 border ${theme.border} ${theme.muted} ${theme.rounded}`}
              onClick={onPackReject}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {phase === "confirm" && built && built.kind === "swap" && (
        <SwapWidget
          userAddress={userAddress}
          targetChain={(built as any).targetChain}
          fromToken={{
            address: (built as any).step.from.address,
            symbol: (built as any).step.from.symbol,
            name: (built as any).step.from.symbol,
            decimals: (built as any).step.from.decimals,
            isNative: (built as any).step.from.isNative
          }}
          toToken={{
            address: (built as any).step.to.address,
            symbol: (built as any).step.to.symbol,
            name: (built as any).step.to.symbol,
            decimals: (built as any).step.to.decimals
          }}
          fromAmountFormatted={(built as any).step.amountInHuman}
          toAmountFormatted={formatUnits(
            (built as any).result.expectedOutWei,
            (built as any).step.to.decimals
          )}
          amountInWei={BigInt((built as any).step.amountInWei)}
          amountOutMin={(built as any).result.amountOutMin}
          slippagePct={(built as any).step.slippagePct}
          transactionRequest={{
            to: (built as any).result.router,
            data: (built as any).result.data,
            value: (built as any).result.value
          }}
          approvalAddress={(built as any).result.approvalAddress}
          theme={theme}
          onOutcome={(o) => {
            if (o.rejected) onStepReject();
            else if (o.reverted) onStepRevert();
            else if (o.ok) onStepSuccess(o.txHash);
          }}
        />
      )}

      {phase === "confirm" && built && (built as { kind: string }).kind === "vault" && (
        <VaultDepositWidget
          theme={theme}
          targetChain={(built as any).targetChain}
          userAddress={userAddress}
          vault={(built as any).step.vault}
          vaultName={(built as any).step.vault}
          verb={(built as any).step.op}
          asset={(built as any).asset}
          amountWei={BigInt((built as any).step.amountWei)}
          amountHuman={(built as any).step.amountHuman}
          previewWei={(built as any).result.previewWei}
          known={true}
          maxDriftBps={50}
          onOutcome={(o) => {
            if (o.rejected) onStepReject();
            else if (o.reverted) onStepRevert();
            else if (o.ok) onStepSuccess(o.txHash);
          }}
        />
      )}

      {phase === "confirm" && built && (built as { kind: string }).kind === "approve" && (
        <VaultApproveWidget
          theme={theme}
          targetChain={(built as any).targetChain}
          vault={(built as any).step.spender}
          vaultName="spender"
          asset={{
            address: (built as any).step.token,
            symbol: "TOKEN",
            name: "TOKEN",
            decimals: 18
          }}
          amountWei={BigInt((built as any).step.amountWei)}
          isRevoke={(built as any).step.amountWei === "0"}
          onOutcome={(o) => {
            if (o.rejected) onStepReject();
            else if (o.reverted) onStepRevert();
            else if (o.ok) onStepSuccess(o.txHash);
          }}
        />
      )}

      {phase === "confirm" && built && (built as { kind: string }).kind === "poly" && (
        <PolyTradeWidget
          theme={theme}
          targetChain={(built as any).targetChain}
          userAddress={userAddress}
          side={(built as any).step.side}
          question={(built as any).step.conditionId}
          outcome={(built as any).step.outcome}
          tokenId={(built as any).step.tokenId}
          negRisk={(built as any).negRisk}
          limitPrice={
            (built as any).step.limitPrice != null
              ? Number((built as any).step.limitPrice)
              : undefined
          }
          tif={(built as any).step.tif}
          amountHuman={(built as any).step.amountHuman}
          amountWei={BigInt(
            (() => {
              try {
                const [a, b = ""] = String((built as any).step.amountHuman).split(".");
                const frac = (b + "000000").slice(0, 6);
                return BigInt(a + frac);
              } catch {
                return 0n;
              }
            })()
          )}
          tickSize={(built as any).tick}
          minOrderSize={(built as any).minSize}
          shownMid={(built as any).mid}
          pusdBalance={0n}
          usdceBalance={0n}
          exchangeAllowance={0n}
          onOutcome={(o) => {
            if (o.rejected) onStepReject();
            else if (o.reverted) onStepRevert();
            else if (o.ok) onStepSuccess(o.txHash, o.orderId);
          }}
        />
      )}

      {phase === "confirm" && built && (built as { kind: string }).kind === "wrap" && (
        <PolyCollateralWidget
          theme={theme}
          targetChain={(built as any).targetChain}
          userAddress={userAddress}
          kind={(built as any).wrapKind}
          amountWei={BigInt((built as any).step.amountWei)}
          spender={POLY_CTF_EXCHANGE}
          isRevoke={false}
          onOutcome={(o) => {
            if (o.rejected) onStepReject();
            else if (o.reverted) onStepRevert();
            else if (o.ok) onStepSuccess(o.txHash);
          }}
        />
      )}

      {(phase === "done" || phase === "aborted") && (
        <div className={`text-[10px] ${theme.muted}`}>
          Run ended. `plan show {plan.name}` for status. Remaining pending steps stay pending.
        </div>
      )}
    </div>
  );
}
