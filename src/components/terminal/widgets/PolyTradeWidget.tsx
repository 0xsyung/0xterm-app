/**
 * @file PolyTradeWidget.tsx
 * @description poly buy/sell — WRAP → APPROVE → SIGN ORDER (not pinnable) (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useMemo, useState } from "react";
import { useSendTransaction, usePublicClient, useWalletClient } from "wagmi";
import { formatUnits, type Address, type Chain } from "viem";
import type { ThemeConfig } from "../types";
import {
  bookDriftAbort,
  buildAmounts,
  buildOrderStruct,
  encodePusdApproveExchange,
  encodeUsdceApproveOnramp,
  encodeWrap,
  estimateTakerFee,
  exchangeForNegRisk,
  fetchBook,
  midpointFromBook,
  polyErrorLine,
  postOrder,
  deriveOrCreateL2,
  roundToTick,
  signOrder,
  truncateAddr,
  type Tif
} from "../poly";

export type PolyTradeProps = {
  theme: ThemeConfig;
  targetChain: Chain;
  userAddress: Address;
  side: "BUY" | "SELL";
  question: string;
  outcome: string;
  tokenId: string;
  negRisk: boolean;
  /** Limit price if set; else market. */
  limitPrice?: number;
  tif: Tif;
  /** BUY: pUSD notional; SELL: shares. */
  amountHuman: string;
  amountWei: bigint;
  tickSize: number;
  minOrderSize: number;
  shownMid: number;
  pusdBalance: bigint;
  usdceBalance: bigint;
  exchangeAllowance: bigint;
  feeRate?: number;
};

type Step = "wrap" | "approve" | "sign" | "done";

export default function PolyTradeWidget(props: PolyTradeProps) {
  const {
    theme,
    targetChain,
    userAddress,
    side,
    question,
    outcome,
    tokenId,
    negRisk,
    limitPrice,
    tif,
    amountHuman,
    amountWei,
    tickSize,
    minOrderSize,
    shownMid,
    pusdBalance,
    usdceBalance,
    exchangeAllowance,
    feeRate = 0
  } = props;

  const exchange = exchangeForNegRisk(negRisk);
  const isMarket = limitPrice == null;
  const price = useMemo(() => {
    const raw = limitPrice ?? shownMid;
    return roundToTick(raw, tickSize);
  }, [limitPrice, shownMid, tickSize]);

  const sizeNum = Number(formatUnits(amountWei, 6));
  const amounts = buildAmounts({
    side,
    price,
    size: sizeNum,
    mode: isMarket && side === "BUY" ? "market" : "limit"
  });
  const makerAmount = amounts?.makerAmount ?? 0n;
  const notional =
    side === "BUY" ? Number(formatUnits(amountWei, 6)) : sizeNum * price;
  const feeEst = estimateTakerFee(notional, price, feeRate);
  const needWrap =
    side === "BUY" && pusdBalance < (amounts?.makerAmount ?? amountWei);
  const wrapAmt =
    needWrap && amounts
      ? amounts.makerAmount - pusdBalance > 0n
        ? amounts.makerAmount - pusdBalance
        : 0n
      : 0n;
  const needApprove =
    side === "BUY" &&
    exchangeAllowance < (amounts?.makerAmount ?? amountWei);

  const [step, setStep] = useState<Step>(
    needWrap ? "wrap" : needApprove ? "approve" : "sign"
  );
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    status: string;
    orderId?: string;
    delayed?: boolean;
  } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [wrapPhase, setWrapPhase] = useState<"approve" | "wrap">("approve");

  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { data: walletClient } = useWalletClient({ chainId: targetChain.id });
  const { sendTransactionAsync } = useSendTransaction();
  const blockExplorer = targetChain.blockExplorers?.default.url;

  const shortQ =
    question.length > 56 ? `${question.slice(0, 56)}…` : question;

  const doWrap = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      if (usdceBalance < wrapAmt) {
        setErrorMsg(polyErrorLine("POLY_NEED_USDCE"));
        setBusy(false);
        return;
      }
      if (wrapPhase === "approve") {
        const { to, data } = encodeUsdceApproveOnramp(wrapAmt);
        const hash = await sendTransactionAsync({
          chainId: targetChain.id,
          to,
          data,
          value: 0n
        });
        setTxHash(hash);
        if (publicClient)
          await publicClient.waitForTransactionReceipt({ hash });
        setWrapPhase("wrap");
        setBusy(false);
        return;
      }
      const w = encodeWrap(userAddress, wrapAmt);
      const hash = await sendTransactionAsync({
        chainId: targetChain.id,
        to: w.to,
        data: w.data,
        value: 0n
      });
      setTxHash(hash);
      if (publicClient)
        await publicClient.waitForTransactionReceipt({ hash });
      setStep(needApprove ? "approve" : "sign");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "failed";
      if (/reject|denied/i.test(msg)) setErrorMsg(polyErrorLine("POLY_USER_REJECT"));
      else setErrorMsg(msg.split("\n")[0]?.slice(0, 180) || "failed");
    }
    setBusy(false);
  };

  const doApprove = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const amt = amounts?.makerAmount ?? amountWei;
      const { to, data } = encodePusdApproveExchange(exchange, amt);
      const hash = await sendTransactionAsync({
        chainId: targetChain.id,
        to,
        data,
        value: 0n
      });
      setTxHash(hash);
      if (publicClient)
        await publicClient.waitForTransactionReceipt({ hash });
      setStep("sign");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "failed";
      if (/reject|denied/i.test(msg)) setErrorMsg(polyErrorLine("POLY_USER_REJECT"));
      else setErrorMsg(msg.split("\n")[0]?.slice(0, 180) || "failed");
    }
    setBusy(false);
  };

  const doSign = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      if (!walletClient) throw new Error("Wallet client unavailable — connect first");
      if (!amounts) throw new Error(polyErrorLine("POLY_TICK"));
      if (sizeNum < minOrderSize && side === "SELL") {
        setErrorMsg(polyErrorLine("POLY_MIN_SIZE", `Min ${minOrderSize} shares.`));
        setBusy(false);
        return;
      }

      // Re-fetch book; abort on drift
      const fresh = await fetchBook(tokenId);
      const freshMid = midpointFromBook(fresh.bestBid, fresh.bestAsk);
      if (freshMid == null || bookDriftAbort(shownMid, freshMid)) {
        setErrorMsg(polyErrorLine("POLY_BOOK_DRIFT"));
        setBusy(false);
        return;
      }

      const order = buildOrderStruct({
        maker: userAddress,
        tokenId,
        makerAmount: amounts.makerAmount,
        takerAmount: amounts.takerAmount,
        side: side === "BUY" ? 0 : 1
      });

      const creds = await deriveOrCreateL2(walletClient, userAddress);
      const signature = await signOrder(walletClient, userAddress, order, negRisk);
      const posted = await postOrder(
        userAddress,
        creds,
        order,
        signature,
        tif,
        negRisk
      );
      if (!posted.success) {
        if (posted.errorMsg === "POLY_GEOBLOCK")
          setErrorMsg(polyErrorLine("POLY_GEOBLOCK"));
        else
          setErrorMsg(
            polyErrorLine("POLY_CLOB_REJECT", posted.errorMsg || "")
          );
        setBusy(false);
        return;
      }
      const delayed = posted.status === "delayed";
      setResult({
        status: posted.status || "live",
        orderId: posted.orderId,
        delayed
      });
      setStep("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "failed";
      if (/reject|denied/i.test(msg)) setErrorMsg(polyErrorLine("POLY_USER_REJECT"));
      else if ((e as { code?: string })?.code === "POLY_GEOBLOCK")
        setErrorMsg(polyErrorLine("POLY_GEOBLOCK"));
      else setErrorMsg(msg.split("\n")[0]?.slice(0, 180) || "failed");
    }
    setBusy(false);
  };

  const stepCount = (needWrap ? 1 : 0) + (needApprove ? 1 : 0) + 1;
  let stepIdx = 1;
  if (step === "wrap") stepIdx = 1;
  else if (step === "approve") stepIdx = needWrap ? 2 : 1;
  else if (step === "sign") stepIdx = stepCount;

  return (
    <div
      className={`my-2 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow} w-full text-xs space-y-3`}
    >
      <div className={`flex justify-between items-center border-b ${theme.border} pb-2`}>
        <span className={`font-bold ${theme.primary}`}>
          POLY {side} — {outcome}
        </span>
        <span className={theme.muted}>POLYGON</span>
      </div>

      <div className={`space-y-1 ${theme.text}`}>
        <div className="truncate">{shortQ}</div>
        <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
          <div>
            <div className={`text-[10px] ${theme.muted}`}>IMPLIED</div>
            <div>{price.toFixed(2)}</div>
          </div>
          <div>
            <div className={`text-[10px] ${theme.muted}`}>
              {side === "BUY" ? "NOTIONAL (pUSD)" : "SHARES"}
            </div>
            <div>{amountHuman}</div>
          </div>
          <div>
            <div className={`text-[10px] ${theme.muted}`}>TIF / LIMIT</div>
            <div>
              {tif}
              {limitPrice != null ? ` @ ${limitPrice}` : " (market)"}
            </div>
          </div>
          <div>
            <div className={`text-[10px] ${theme.muted}`}>TAKER FEE EST.</div>
            <div>{feeEst.toFixed(4)} pUSD</div>
          </div>
        </div>
      </div>

      <div className={`border-t ${theme.border} pt-2 grid grid-cols-2 gap-2 font-mono tabular-nums`}>
        <div>
          <div className={`text-[10px] ${theme.muted}`}>pUSD</div>
          <div>{formatUnits(pusdBalance, 6)}</div>
        </div>
        <div>
          <div className={`text-[10px] ${theme.muted}`}>USDC.e</div>
          <div className={needWrap ? theme.warn : undefined}>
            {formatUnits(usdceBalance, 6)}
            {needWrap ? " · wrap needed" : ""}
          </div>
        </div>
        <div className="col-span-2">
          <div className={`text-[10px] ${theme.muted}`}>
            APPROVAL → {truncateAddr(exchange)} · exact · revoke{" "}
            <span className={theme.primary}>poly approve 0</span>
          </div>
          <div>
            {formatUnits(exchangeAllowance, 6)} pUSD
            {needApprove ? ` → need ${formatUnits(makerAmount || amountWei, 6)}` : ""}
          </div>
        </div>
      </div>

      <div className={`text-[10px] ${theme.muted}`}>
        Before sign: market={shortQ.slice(0, 32)} · outcome={outcome} · price={price.toFixed(2)} ·
        size={amountHuman} · Exchange={truncateAddr(exchange)} · signatureType 0
      </div>

      {errorMsg && <div className={`p-2 border rounded ${theme.warn}`}>{errorMsg}</div>}

      {result && (
        <div
          className={`p-2 border ${theme.border} ${theme.cardBg} ${theme.rounded} space-y-1`}
        >
          <div className={`font-bold ${result.delayed ? theme.warn : theme.primary}`}>
            CLOB {result.status.toUpperCase()}
            {result.delayed ? " — Accepted, not yet matched. Not a fill." : ""}
          </div>
          {result.orderId && (
            <div className="text-[10px] font-mono">
              order {truncateAddr(result.orderId, 8, 6)}
            </div>
          )}
          <div className={`text-[10px] ${theme.muted}`}>
            A successful POST /order is not an on-chain receipt.
          </div>
        </div>
      )}

      {txHash && blockExplorer && step !== "done" && (
        <a
          href={`${blockExplorer}/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className={`text-[10px] underline ${theme.primary}`}
        >
          Last on-chain tx ↗
        </a>
      )}

      <div className="pt-1">
        {busy && (
          <div className={`${theme.warn} font-bold animate-pulse`}>
            CONFIRM IN WALLET...
          </div>
        )}
        {!busy && step === "wrap" && (
          <button
            onClick={doWrap}
            className={`px-4 py-1.5 border ${theme.border} bg-current/30 hover:bg-current/50 ${theme.primary} font-bold ${theme.rounded} cursor-pointer`}
          >
            {wrapPhase === "approve"
              ? `[ STEP ${stepIdx}/${stepCount}: APPROVE USDC.e ]`
              : `[ STEP ${stepIdx}/${stepCount}: WRAP ]`}
          </button>
        )}
        {!busy && step === "approve" && (
          <button
            onClick={doApprove}
            className={`px-4 py-1.5 border ${theme.border} bg-current/30 hover:bg-current/50 ${theme.primary} font-bold ${theme.rounded} cursor-pointer`}
          >
            {`[ STEP ${stepIdx}/${stepCount}: APPROVE ]`}
          </button>
        )}
        {!busy && step === "sign" && (
          <button
            onClick={doSign}
            className={`px-4 py-1.5 border ${theme.border} bg-current/30 hover:bg-current/50 ${theme.primary} font-bold ${theme.rounded} cursor-pointer`}
          >
            {`[ STEP ${stepIdx}/${stepCount}: SIGN ORDER ]`}
          </button>
        )}
      </div>
    </div>
  );
}
