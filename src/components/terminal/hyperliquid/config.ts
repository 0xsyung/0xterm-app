/**
 * @file config.ts
 * @description Hyperliquid network URLs, chain ids, builder fee knobs (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

/** HyperEVM mainnet (perps L1 paired with api.hyperliquid.xyz). */
export const HL_MAINNET_CHAIN_ID = 999;
/** HyperEVM testnet (perps L1 paired with api.hyperliquid-testnet.xyz). */
export const HL_TESTNET_CHAIN_ID = 998;

/** L1 Agent typed-data domain chainId — fixed HL constant, not an EVM network. */
export const HL_L1_TYPED_DATA_CHAIN_ID = 1337;

/**
 * EIP-712 signatureChainId for user-signed actions (approveAgent / approveBuilderFee).
 * Wallets must be able to switch to this chain. Demo + SDK use Arbitrum Sepolia for
 * testnet and Arbitrum One for mainnet — not HyperEVM itself.
 */
export const HL_TESTNET_SIGNATURE_CHAIN_ID = 0x66eee; // Arbitrum Sepolia
export const HL_MAINNET_SIGNATURE_CHAIN_ID = 0xa4b1; // Arbitrum One

export const HL_API_MAINNET = "https://api.hyperliquid.xyz";
export const HL_API_TESTNET = "https://api.hyperliquid-testnet.xyz";

export type HlNetwork = "mainnet" | "testnet";

/** Default product network for PERPS v1 — testnet first (Manager lock). */
export const HL_DEFAULT_NETWORK: HlNetwork = "testnet";

export const HL_BUILDER_FEE_BP_OPTIONS = [0.5, 1, 2, 5, 10] as const;
export type HlBuilderFeeBp = (typeof HL_BUILDER_FEE_BP_OPTIONS)[number];

/** Manager lock: default 2 bp (0.02%) both sides. */
export const HL_DEFAULT_BUILDER_FEE_BP: HlBuilderFeeBp = 2;

export const HL_MIN_BUILDER_FEE_BP = 0.5;
export const HL_MAX_BUILDER_FEE_BP = 10;

/**
 * 0xterm builder address that receives fee share on routed fills.
 * Ops must set `NEXT_PUBLIC_HL_BUILDER_ADDRESS` to the funded (≥100 USDC) builder.
 * Placeholder is a zero address — orders will fail until configured.
 */
export const HL_BUILDER_ADDRESS_ENV = "NEXT_PUBLIC_HL_BUILDER_ADDRESS";

export const HL_BUILDER_ADDRESS_PLACEHOLDER =
  "0x0000000000000000000000000000000000000000" as const;

export function resolveBuilderAddress(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {}
): `0x${string}` {
  const raw = (env[HL_BUILDER_ADDRESS_ENV] || "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return raw.toLowerCase() as `0x${string}`;
  }
  return HL_BUILDER_ADDRESS_PLACEHOLDER;
}

export function isBuilderAddressConfigured(
  addr: string = resolveBuilderAddress()
): boolean {
  return (
    /^0x[a-fA-F0-9]{40}$/i.test(addr) &&
    addr.toLowerCase() !== HL_BUILDER_ADDRESS_PLACEHOLDER
  );
}

export function hlApiBase(network: HlNetwork): string {
  return network === "mainnet" ? HL_API_MAINNET : HL_API_TESTNET;
}

export function hlHyperliquidChain(network: HlNetwork): "Mainnet" | "Testnet" {
  return network === "mainnet" ? "Mainnet" : "Testnet";
}

export function hlSignatureChainId(network: HlNetwork): number {
  return network === "mainnet"
    ? HL_MAINNET_SIGNATURE_CHAIN_ID
    : HL_TESTNET_SIGNATURE_CHAIN_ID;
}

export function hlSignatureChainIdHex(network: HlNetwork): `0x${string}` {
  return `0x${hlSignatureChainId(network).toString(16)}`;
}

export function hlEvmChainId(network: HlNetwork): number {
  return network === "mainnet" ? HL_MAINNET_CHAIN_ID : HL_TESTNET_CHAIN_ID;
}

export function networkFromEvmChainId(chainId: number | null | undefined): HlNetwork {
  if (chainId === HL_MAINNET_CHAIN_ID) return "mainnet";
  return "testnet";
}

export function isHlEvmChainId(chainId: number | null | undefined): boolean {
  return chainId === HL_MAINNET_CHAIN_ID || chainId === HL_TESTNET_CHAIN_ID;
}

/** Agent localStorage key — private key only, never export UI. */
export function hlAgentStorageKey(
  masterAddress: string,
  network: HlNetwork
): string {
  return `0xterm_hl_agent_${network}_${masterAddress.toLowerCase()}`;
}

/** Persisted builder-approval flag (max fee string) per master+network+builder. */
export function hlBuilderApprovalStorageKey(
  masterAddress: string,
  network: HlNetwork,
  builder: string
): string {
  return `0xterm_hl_builder_${network}_${masterAddress.toLowerCase()}_${builder.toLowerCase()}`;
}

export const HL_AGENT_NAME = "0xterm";

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;
