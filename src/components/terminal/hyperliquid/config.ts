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
 * The SDK hardcodes 0x66eee (Arbitrum Sepolia) for BOTH networks — the
 * signatureChainId field AND the EIP-712 domain chainId. Soft ACK #260: PERPS
 * CONNECT signs typed-data first (domain embeds 0x66eee) so iOS Safari/WC keeps
 * the user gesture; chain align is a best-effort retry only. After success the
 * wallet is restored to HyperEVM. Same signing chain for mainnet and testnet.
 */
export const HL_TESTNET_SIGNATURE_CHAIN_ID = 0x66eee; // Arbitrum Sepolia
export const HL_MAINNET_SIGNATURE_CHAIN_ID = 0x66eee; // Arbitrum Sepolia (SDK constant for both)

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
 *
 * Next.js only inlines `NEXT_PUBLIC_*` for **static** `process.env.NEXT_PUBLIC_*`
 * access. Dynamic keys (e.g. `env[HL_BUILDER_ADDRESS_ENV]`) stay empty in the
 * client bundle — see resolveBuilderAddress.
 */
export const HL_BUILDER_ADDRESS_ENV = "NEXT_PUBLIC_HL_BUILDER_ADDRESS";

export const HL_BUILDER_ADDRESS_PLACEHOLDER =
  "0x0000000000000000000000000000000000000000" as const;

/**
 * Resolve the builder fee recipient address.
 *
 * Production path uses a **static** `process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS`
 * reference so Next embeds the deploy-time secret into the client chunk.
 * Optional `env` override is for unit tests only (dynamic keys are fine there).
 */
export function resolveBuilderAddress(
  env?: Record<string, string | undefined>
): `0x${string}` {
  // Static property access — required for Next.js NEXT_PUBLIC_* inlining.
  const fromProcess = (process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS || "").trim();
  const raw = (
    env !== undefined
      ? (env.NEXT_PUBLIC_HL_BUILDER_ADDRESS ??
          env[HL_BUILDER_ADDRESS_ENV] ??
          "")
      : fromProcess
  ).trim();
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

/**
 * On-chain USDC deposit targets for the Hyperliquid bridge (demo
 * src/ethereum/bridge.ts). Depositing = sending native USDC from the listed EVM
 * chain to the bridge; HyperCore credits the *sending* account in under a
 * minute (`HL_MIN_DEPOSIT_USDC` minimum — smaller amounts are not credited and
 * are lost). Mainnet uses Arbitrum One (0xa4b1), testnet uses Arbitrum Sepolia
 * (0x66eee) — the same chain the user-signed signing flow already switches to.
 */
/** Hyperliquid bridge minimum — deposits below this are not credited / lost. */
export const HL_MIN_DEPOSIT_USDC = 5;

export type HlDepositTarget = {
  /** EIP-1193 hex chain id of the deposit chain. */
  chainId: number;
  /** Native USDC (Circle) on the deposit chain. */
  usdcAddress: `0x${string}`;
  /** Hyperliquid deposit bridge contract. */
  bridgeAddress: `0x${string}`;
};

export const HL_DEPOSIT: Record<HlNetwork, HlDepositTarget> = {
  mainnet: {
    chainId: 0xa4b1, // Arbitrum One
    usdcAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    bridgeAddress: "0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7"
  },
  testnet: {
    chainId: 0x66eee, // Arbitrum Sepolia
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    bridgeAddress: "0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89"
  }
};

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
