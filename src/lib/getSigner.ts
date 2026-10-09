/**
 * @file getSigner.ts
 * @description Active signer resolution — local unlocked > selected injected > prompt (#29).
 *   Not a React hook. Local returns a viem WalletClient; injected is a sentinel
 *   so existing wagmi write hooks keep sending.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  createWalletClient,
  http,
  type Address,
  type Chain,
  type LocalAccount,
  type WalletClient
} from "viem";
import {
  getEnvelope,
  getSelectedAccount,
  getSelectedAddress,
  getSignerPref,
  isUnlocked
} from "./localWallet/vault";
import { WalletError } from "./localWallet/types";

export type ActiveSigner =
  | {
      kind: "local";
      account: LocalAccount;
      address: Address;
      walletClient: WalletClient;
    }
  | {
      kind: "injected";
      address: Address;
    };

export type GetSignerContext = {
  injectedAddress?: Address | null;
  injectedConnected?: boolean;
  chain?: Chain | null;
  rpcUrl?: string | null;
};

/**
 * Resolve the active signer.
 * Precedence (locked): local unlocked > selected injected > prompt.
 * `wallet use injected` while local unlocked flips pref → injected wins.
 */
export async function getSigner(
  ctx: GetSignerContext = {}
): Promise<ActiveSigner> {
  const pref = getSignerPref();
  const localOn = isUnlocked();
  const localAccount = getSelectedAccount();
  const localAddr = getSelectedAddress();
  const injectedOk = Boolean(ctx.injectedConnected && ctx.injectedAddress);

  // Explicit injected preference while connected
  if (pref === "injected" && injectedOk && ctx.injectedAddress) {
    return { kind: "injected", address: ctx.injectedAddress };
  }

  // Local unlocked (injected-preferred path already returned above)
  if (localOn && localAccount && localAddr) {
    if (!ctx.chain) {
      throw new WalletError(
        "WALLET_CHAIN",
        "set an active network before signing with the local wallet."
      );
    }
    const walletClient = createWalletClient({
      account: localAccount,
      chain: ctx.chain,
      transport: http(ctx.rpcUrl || undefined)
    });
    return {
      kind: "local",
      account: localAccount,
      address: localAddr,
      walletClient
    };
  }

  // Pref local but locked
  if (pref === "local") {
    const env = await getEnvelope();
    if (env) throw new WalletError("WALLET_LOCKED");
  }

  if (injectedOk && ctx.injectedAddress) {
    return { kind: "injected", address: ctx.injectedAddress };
  }

  const env = await getEnvelope();
  if (env && !localOn) throw new WalletError("WALLET_LOCKED");
  throw new Error("type connect  or  wallet create");
}

export function assertLocalChain(
  terminalChainId: number,
  txChainId: number,
  terminalName?: string
): void {
  if (terminalChainId !== txChainId) {
    throw new WalletError(
      "WALLET_CHAIN",
      `local wallet will not sign a tx for chain ${txChainId} while terminal is on ${terminalName || terminalChainId} (${terminalChainId}).`
    );
  }
}

export type ChipState =
  | { kind: "local"; address: Address }
  | { kind: "locked" }
  | { kind: "injected"; address: Address }
  | { kind: "none" };

/** Sync chip state. Pass `vaultExists` from a hydrated envelope check. */
export function resolveChipState(opts: {
  vaultExists: boolean;
  injectedAddress?: Address | null;
  injectedConnected?: boolean;
}): ChipState {
  const pref = getSignerPref();
  const localOn = isUnlocked();
  const localAddr = getSelectedAddress();

  if (pref === "injected" && opts.injectedConnected && opts.injectedAddress) {
    return { kind: "injected", address: opts.injectedAddress };
  }
  if (localOn && localAddr) {
    return { kind: "local", address: localAddr };
  }
  if (opts.injectedConnected && opts.injectedAddress) {
    return { kind: "injected", address: opts.injectedAddress };
  }
  if (opts.vaultExists) return { kind: "locked" };
  return { kind: "none" };
}
