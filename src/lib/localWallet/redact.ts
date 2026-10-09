/**
 * @file redact.ts
 * @description Redact wallet create|import|unlock|export|nuke argv from logs/history (#29).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

const SECRET_SUBS = new Set([
  "create",
  "import",
  "unlock",
  "export",
  "nuke"
]);

/**
 * For sensitive wallet subcommands, drop argv so seeds/passwords never hit
 * logs or history. Returns the lines to echo / persist.
 */
export function redactWalletCommand(raw: string): {
  logLine: string;
  historyLine: string;
  redacted: boolean;
} {
  const trimmed = raw.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const cmd = parts[0]?.toLowerCase();
  if (cmd !== "wallet" && cmd !== "w") {
    return { logLine: trimmed, historyLine: trimmed, redacted: false };
  }
  const sub = parts[1]?.toLowerCase();
  if (!sub || !SECRET_SUBS.has(sub)) {
    return { logLine: trimmed, historyLine: trimmed, redacted: false };
  }
  const safe = `wallet ${sub}`;
  return { logLine: safe, historyLine: safe, redacted: true };
}
