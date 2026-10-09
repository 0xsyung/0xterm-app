/**
 * @file exportOmit.ts
 * @description Default export JSON must omit vault; --include-wallet only when unlocked (#29).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { VaultEnvelopeV1 } from "./types";
import { WalletError } from "./types";
import { getEnvelope, isUnlocked } from "./vault";

export type ProfileExportBase = {
  version: string;
  wallet: string;
  preferences: unknown;
  customTokens: unknown;
  pinned: unknown;
  chatChannels?: unknown;
  vault?: VaultEnvelopeV1;
};

/** Build export payload. Vault omitted unless includeWallet + unlocked. */
export async function buildProfileExport(
  base: Omit<ProfileExportBase, "vault">,
  opts: { includeWallet?: boolean } = {}
): Promise<ProfileExportBase> {
  if (!opts.includeWallet) {
    return { ...base };
  }
  if (!isUnlocked()) throw new WalletError("WALLET_LOCKED");
  const envelope = await getEnvelope();
  if (!envelope) throw new WalletError("WALLET_NONE");
  // Ciphertext only — never plaintext
  return {
    ...base,
    vault: {
      version: envelope.version,
      cipher: envelope.cipher,
      kdf: envelope.kdf,
      kdfParams: envelope.kdfParams,
      saltB64: envelope.saltB64,
      ivB64: envelope.ivB64,
      ciphertextB64: envelope.ciphertextB64,
      source: envelope.source,
      createdAt: envelope.createdAt,
      accountCount: envelope.accountCount,
      addresses: envelope.addresses,
      pathPrefix: envelope.pathPrefix
    }
  };
}

export function exportHasVaultSecrets(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const v = data as Record<string, unknown>;
  if ("mnemonic" in v || "privateKey" in v || "passphrase" in v) return true;
  const vault = v.vault;
  if (vault && typeof vault === "object") {
    const e = vault as Record<string, unknown>;
    if ("mnemonic" in e || "privateKey" in e || "passphrase" in e) return true;
  }
  return false;
}
