/**
 * @file sanitize.ts
 * @description Cat text: strip tags; never HTML-as-markup (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { IPFS_CAT_PREVIEW_BYTES } from "./constants";

/**
 * Strip HTML/SVG tags from cat preview text. Returns plain text only.
 * Truncates to 64 KiB with a notice.
 */
export function sanitizeCatText(
  raw: string,
  maxBytes = IPFS_CAT_PREVIEW_BYTES
): { text: string; truncated: boolean; totalBytes: number } {
  const totalBytes = new TextEncoder().encode(raw).length;
  // Strip tags — keep text content only
  const stripped = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const bytes = new TextEncoder().encode(stripped);
  if (bytes.length <= maxBytes) {
    return { text: stripped, truncated: false, totalBytes };
  }
  // Truncate by bytes, then decode safely
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  const sliced = new TextDecoder().decode(bytes.slice(0, end));
  return {
    text: `${sliced}\n… truncated — ${totalBytes} bytes`,
    truncated: true,
    totalBytes
  };
}
