/**
 * @file PlanRunWidget.tsx
 * @description Step-by-step plan run — rebuild, drift, reuse live confirm widgets (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatUnits,
  type Address,
  type Chain,
  type PublicClient
} from "viem";
import type { ThemeConfig } from "../types";
import type { Plan, PlanStep } from "../plan/types";
import { planErrorLine, sanitizePlanErr } from "../plan/errors";
import { stepSummary } from "../plan/summary";
import { PLAN_WARN_BANNER } from "../plan/constants";
import { rebuildSwapCalldata } from "../plan/swapRebuild";
import { rebuildVaultCalldata } from "../plan/vaultRebuild";
import { encodeApproveStep } from "../plan/approveEncode";
import { polyBookDrift } from "../plan/drift";
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
  | "waiting"
  | "advance"
  | "done"
  | "aborted";

export default function PlanRunWidget({
  theme,
  plan: planProp,
  userAddress,
  activeChainId,
  chainObj,
  client,
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
  onPlansUpdate: (plan: Plan) => void;
  onSessionEnd: () => void;
  onPin?: () => void;
}) {
  const [plan, setPlan] = useState(planProp);
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [built, setBuilt] = useState<any>(null);

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

  const abortRest = useCallback(
    (idx: number, reason: string, code: "PLAN_DRIFT" | "PLAN_USER_REJECT" | "PLAN_STEP_REVERT" | "PLAN_WRONG_CHAIN" | "PLAN_STALE_DEX" = "PLAN_DRIFT") => {
      patchStep(idx, {
        lastSim: { at: Date.now(), ok: false, reason }
      });
      setMsg(planErrorLine(code, reason));
      setPhase("aborted");
      onSessionEnd();
    },
    [patchStep, onSessionEnd]
  );

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

    try {
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
        // eth_call dry-run
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
  }, [
    step,
    pendingIdx,
    client,
    userAddress,
    activeChainId,
    chainObj,
    abortRest,
    patchStep,
    onSessionEnd
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

  return (
    <div
      className={`relative text-xs space-y-2 my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow || ""} w-full ${theme.text}`}
    >
      <div
        className={`flex justify-between items-center border-b ${theme.border} pb-1`}
      >
        <span className={`font-bold ${theme.primary} tracking-wider`}>
          PLAN RUN {plan.name}
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
            // amountHuman decimal → wei approx via 6 decimals for pUSD/shares
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
