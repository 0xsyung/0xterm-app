/**
 * @file redact.ts
 * @description Redact `ipfs set pinata|storacha <token>` for history/log (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

/**
 * `ipfs set pinata eyJ…` → `ipfs set pinata ***`
 * Also covers storacha. Non-matching lines returned unchanged.
 */
export function redactIpfsHistory(raw: string): {
  logLine: string;
  historyLine: string;
  redacted: boolean;
} {
  const trimmed = raw.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const cmd = parts[0]?.toLowerCase();
  if (cmd !== "ipfs") {
    return { logLine: trimmed, historyLine: trimmed, redacted: false };
  }
  const sub = parts[1]?.toLowerCase();
  if (sub !== "set") {
    return { logLine: trimmed, historyLine: trimmed, redacted: false };
  }
  const provider = parts[2]?.toLowerCase();
  if (provider !== "pinata" && provider !== "storacha") {
    return { logLine: trimmed, historyLine: trimmed, redacted: false };
  }
  // Always redact anything after the provider name
  const safe = `ipfs set ${provider} ***`;
  return { logLine: safe, historyLine: safe, redacted: true };
}
