/**
 * @file constants.ts
 * @description Mixer pools, ABIs, fail catalog, usage — Soft ACK #111
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address } from "viem";

export type MixerToken = "ETH" | "DAI" | "USDC" | "WBTC";

export type MixerPool = {
  id: string;
  chainId: number;
  address: Address;
  denomination: string; // human, e.g. "0.1"
  denominationWei: bigint;
  token: MixerToken;
  tokenAddress: Address | null; // null = native
  decimals: number;
};

/** Tornado Cash Classic–style fixed-denom pools (v1 registry). */
export const MIXER_POOLS: MixerPool[] = [
  // Ethereum mainnet ETH
  {
    id: "eth-0.1",
    chainId: 1,
    address: "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc",
    denomination: "0.1",
    denominationWei: 10n ** 17n,
    token: "ETH",
    tokenAddress: null,
    decimals: 18
  },
  {
    id: "eth-1",
    chainId: 1,
    address: "0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936",
    denomination: "1",
    denominationWei: 10n ** 18n,
    token: "ETH",
    tokenAddress: null,
    decimals: 18
  },
  {
    id: "eth-10",
    chainId: 1,
    address: "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF",
    denomination: "10",
    denominationWei: 10n * 10n ** 18n,
    token: "ETH",
    tokenAddress: null,
    decimals: 18
  },
  {
    id: "eth-100",
    chainId: 1,
    address: "0xA160cdAB225685dA1d56aa342Ad8841c3b53f291",
    denomination: "100",
    denominationWei: 100n * 10n ** 18n,
    token: "ETH",
    tokenAddress: null,
    decimals: 18
  },
  // Arbitrum One ETH (Classic deployments)
  {
    id: "arb-eth-0.1",
    chainId: 42161,
    address: "0x84443CFd09A48AF6eF360C6976C5392aC5023a1F",
    denomination: "0.1",
    denominationWei: 10n ** 17n,
    token: "ETH",
    tokenAddress: null,
    decimals: 18
  },
  {
    id: "arb-eth-1",
    chainId: 42161,
    address: "0xd47438C816c9E7f2E2888E060936a499Af9582b3",
    denomination: "1",
    denominationWei: 10n ** 18n,
    token: "ETH",
    tokenAddress: null,
    decimals: 18
  },
  {
    id: "arb-eth-10",
    chainId: 42161,
    address: "0x330bdFADE01eE9bF63C209Ee33102DD334618e0a",
    denomination: "10",
    denominationWei: 10n * 10n ** 18n,
    token: "ETH",
    tokenAddress: null,
    decimals: 18
  },
  {
    id: "arb-eth-100",
    chainId: 42161,
    address: "0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD",
    denomination: "100",
    denominationWei: 100n * 10n ** 18n,
    token: "ETH",
    tokenAddress: null,
    decimals: 18
  }
];

export type MixerErrorCode =
  | "MIXER_NO_WALLET"
  | "MIXER_NO_POOLS"
  | "MIXER_BAD_AMOUNT"
  | "MIXER_BAD_NOTE"
  | "MIXER_SPENT"
  | "MIXER_NEED_RECIPIENT"
  | "MIXER_PROOF_FAIL"
  | "MIXER_DEPOSIT_REVERT"
  | "MIXER_USER_REJECT"
  | "MIXER_WRONG_CHAIN"
  | "MIXER_UNLOCK";

export const MIXER_ERROR_COPY: Record<MixerErrorCode, string> = {
  MIXER_NO_WALLET: "Wallet not connected.",
  MIXER_NO_POOLS: "No mixer pools on this chain.",
  MIXER_BAD_AMOUNT:
    "Amount must match a fixed pool denomination. Try `mixer pools`.",
  MIXER_BAD_NOTE: "Invalid or forged note format — refused before on-chain work.",
  MIXER_SPENT: "Note already used.",
  MIXER_NEED_RECIPIENT: "Withdraw needs a recipient address in v1.",
  MIXER_PROOF_FAIL:
    "Proof failed (missing circuit / low memory). Circuits lazy-load; try again or check memory.",
  MIXER_DEPOSIT_REVERT: "Deposit reverted.",
  MIXER_USER_REJECT: "Mixer cancelled.",
  MIXER_WRONG_CHAIN: "Pool is on another network — switch with `network`.",
  MIXER_UNLOCK: "Note store locked — unlock / enter passphrase."
};

export function mixerErrorLine(code: MixerErrorCode, detail?: string): string {
  const base = MIXER_ERROR_COPY[code];
  // Soft catalog: MIXER_NO_POOLS → "No mixer pools on <chain>." handled by caller
  if (detail) return `${base.replace(/\.$/, "")} ${detail}`.trim();
  return base;
}

export const MIXER_USAGE = `mixer                              # usage synopsis
mixer help                         # same
mixer pools                        # fixed-denom pools on this chain
mixer deposit <amount> [pool]      # generate encrypted note + deposit
mixer withdraw <note> [recipient] [pool]
mixer status <note>                # spent / unspent (no secrets)
mixer notes                        # local encrypted notes (secrets never shown)

Tornado Classic–style v1 · no relayer · recipient needs gas · check local law.
KYT/KYA may label mixer activity. Not legal advice.`;

export const MIXER_POOLS_FOOTER =
  "fixed-denom Classic pools · anonymity set = pool activity · not legal advice";

export const MIXER_LEGAL_FOOTER =
  "Not legal advice. User is responsible for local law. FORENSIC kyt/kya may label mixer activity. 0xterm never auto-blocks swaps.";

export const MIXER_PRIVACY_WARN =
  "Mixing privacy depends on anonymity set + a fresh recipient + (ideally later) a relayer. Terminal may log tx hashes. 0xterm does not guarantee anonymity. Not legal advice — check local law.";

export const MIXER_SAME_ADDR_WARN =
  "Recipient matches this wallet — linkable. Prefer a fresh address.";

export const MIXER_SUBCOMMANDS = [
  "pools",
  "deposit",
  "withdraw",
  "status",
  "notes",
  "help"
] as const;

/** Tornado Classic pool ABI (deposit / withdraw / isSpent / roots). */
export const mixerPoolAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [{ name: "_commitment", type: "bytes32" }],
    outputs: []
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "payable",
    inputs: [
      { name: "_proof", type: "bytes" },
      { name: "_root", type: "bytes32" },
      { name: "_nullifierHash", type: "bytes32" },
      { name: "_recipient", type: "address" },
      { name: "_relayer", type: "address" },
      { name: "_fee", type: "uint256" },
      { name: "_refund", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "isSpent",
    stateMutability: "view",
    inputs: [{ name: "_nullifierHash", type: "bytes32" }],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "getLastRoot",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }]
  },
  {
    type: "function",
    name: "nextIndex",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  }
] as const;

export const erc20MixerAbi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }]
  }
] as const;

export function poolsForChain(chainId: number): MixerPool[] {
  return MIXER_POOLS.filter((p) => p.chainId === chainId);
}

export function findPool(
  chainId: number,
  amountOrId?: string
): MixerPool | null {
  const list = poolsForChain(chainId);
  if (!amountOrId) return null;
  const q = amountOrId.trim().toLowerCase();
  const byId = list.find((p) => p.id.toLowerCase() === q);
  if (byId) return byId;
  const byDenom = list.filter((p) => p.denomination === q || p.denomination === amountOrId.trim());
  if (byDenom.length === 1) return byDenom[0];
  return null;
}

export function truncateHex(hex: string, left = 6, right = 4): string {
  const h = hex.startsWith("0x") ? hex : `0x${hex}`;
  if (h.length <= left + right + 2) return h;
  return `${h.slice(0, left + 2)}…${h.slice(-right)}`;
}
