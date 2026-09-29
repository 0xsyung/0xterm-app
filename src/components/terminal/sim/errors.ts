/**
 * @file errors.ts
 * @description sim / trace error → copy resolver (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { SIM_ERROR, type SimErrorCode } from "./constants";

export function simErrorText(
  code: SimErrorCode,
  param?: string
): string {
  const entry = SIM_ERROR[code];
  if (typeof entry === "function") return (entry as (p: string) => string)(param || "");
  return entry;
}
