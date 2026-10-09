/**
 * @file activeWrite.ts
 * @description Helpers for routing writes through getSigner (#29 tip).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address, Chain, Hex, WalletClient } from "viem";
import type { ActiveSigner } from "../getSigner";
import { assertLocalChain } from "../getSigner";
import { WalletError } from "./types";

export type WriteContractArgs = {
  chainId: number;
  address: Address;
  abi: readonly unknown[] | unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  account?: Address;
};

export type SendTxArgs = {
  chainId: number;
  to: Address;
  data?: Hex;
  value?: bigint;
};

export type TxConfirmFields = {
  to: string;
  summary: string;
  value: string;
  chainLabel: string;
  gas?: string;
};

/** Build confirm fields from a writeContract-style call. */
export function buildWriteConfirm(opts: {
  to: Address;
  summary: string;
  value?: bigint;
  chain: Chain;
  gas?: string;
}): TxConfirmFields {
  const native = opts.chain.nativeCurrency?.symbol || "ETH";
  const valueStr =
    opts.value && opts.value > 0n
      ? `${formatEtherApprox(opts.value)} ${native}`
      : `0 ${native}`;
  return {
    to: opts.to,
    summary: opts.summary,
    value: valueStr,
    chainLabel: `${opts.chain.name} (${opts.chain.id})`,
    gas: opts.gas
  };
}

function formatEtherApprox(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = wei % 10n ** 18n;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${fracStr.slice(0, 6)}`;
}

export function assertSignerChain(
  signer: ActiveSigner,
  terminalChainId: number,
  txChainId: number,
  terminalName?: string
): void {
  if (signer.kind === "local") {
    assertLocalChain(terminalChainId, txChainId, terminalName);
  }
}

/** Local write via WalletClient with explicit chain. */
export async function localWriteContract(
  walletClient: WalletClient,
  chain: Chain,
  args: WriteContractArgs
): Promise<Hex> {
  if (args.chainId !== chain.id) {
    throw new WalletError(
      "WALLET_CHAIN",
      `local wallet will not sign a tx for chain ${args.chainId} while terminal is on ${chain.name} (${chain.id}).`
    );
  }
  // viem's writeContract is heavily generic; cast at the boundary.
  const hash = await (
    walletClient.writeContract as (req: Record<string, unknown>) => Promise<Hex>
  )({
    chain,
    address: args.address,
    abi: args.abi,
    functionName: args.functionName,
    args: args.args,
    value: args.value,
    account: walletClient.account
  });
  return hash;
}

export async function localSendTransaction(
  walletClient: WalletClient,
  chain: Chain,
  args: SendTxArgs
): Promise<Hex> {
  if (args.chainId !== chain.id) {
    throw new WalletError(
      "WALLET_CHAIN",
      `local wallet will not sign a tx for chain ${args.chainId} while terminal is on ${chain.name} (${chain.id}).`
    );
  }
  const hash = await (
    walletClient.sendTransaction as (req: Record<string, unknown>) => Promise<Hex>
  )({
    chain,
    to: args.to,
    data: args.data,
    value: args.value ?? 0n,
    account: walletClient.account
  });
  return hash;
}

/** True when connection gate should pass for local unlocked or injected. */
export function hasActiveWallet(opts: {
  localUnlocked: boolean;
  injectedConnected: boolean;
}): boolean {
  return opts.localUnlocked || opts.injectedConnected;
}
