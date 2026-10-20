/**
 * @file constants.ts
 * @description IPFS share constants (#13 Soft ACK)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export const IPFS_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB
export const IPFS_CAT_PREVIEW_BYTES = 64 * 1024; // 64 KiB text
export const IPFS_CAT_NO_PREVIEW_BYTES = 5 * 1024 * 1024; // 5 MiB
export const IPFS_PINS_CAP = 50;

export const IPFS_PUBLIC_WARN =
  "PUBLIC — anyone with the CID can fetch this. Pinning is not encryption.";

export const IPFS_USAGE =
  "Usage: ipfs [add|cat|pin|ls|rm|set|unset] · share ≡ ipfs add";

export const IPFS_PINATA_URL =
  "https://api.pinata.cloud/pinning/pinFileToIPFS";

export const IPFS_DEFAULT_GATEWAY_HOST = "ipfs.io";
export const IPFS_FALLBACK_GATEWAY_HOST = "dweb.link";

/** Dead / banned gateway hosts — never print or fetch. */
export const IPFS_BANNED_GATEWAY_HOSTS = new Set([
  "w3s.link",
  "cloudflare-ipfs.com",
  "cf-ipfs.com"
]);

export const IPFS_INLINE_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp"
]);

export const IPFS_TEXT_MIMES = new Set([
  "text/plain",
  "application/json",
  "text/markdown",
  "text/csv",
  "application/javascript",
  "text/javascript",
  "text/html", // shown as textContent only — never as markup
  "image/svg+xml" // treat as text/file, not inline image
]);

export const SHARE_CARD_SUBS = new Set([
  "portfolio",
  "pnl",
  "status",
  "off",
  "unshare"
]);
