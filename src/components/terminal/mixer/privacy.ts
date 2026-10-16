/**
 * @file privacy.ts
 * @description One-time mixer privacy warning persistence — Soft ACK #111
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

const WARN_PREFIX = "0xterm_mixer_privacy_ack_";

export function privacyWarnStorageKey(owner: string): string {
  return `${WARN_PREFIX}${owner.toLowerCase()}`;
}

export function hasAckedPrivacyWarn(owner: string): boolean {
  try {
    return localStorage.getItem(privacyWarnStorageKey(owner)) === "1";
  } catch {
    return false;
  }
}

export function ackPrivacyWarn(owner: string): void {
  try {
    localStorage.setItem(privacyWarnStorageKey(owner), "1");
  } catch {
    /* ignore */
  }
}
