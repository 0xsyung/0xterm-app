/**
 * @file fieldClasses.ts
 * @description Shared V2 / terminal form field width tokens (#313)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

import type { ThemeConfig } from "../types";

export type FieldWidth = "default" | "address";

/** Touch + chrome shared by selects / inputs. */
export const FIELD_BASE = "min-h-[44px] px-3 text-base border";

/** Default short fields — 20rem / 320px cap. */
export const FIELD_WIDTH_DEFAULT = "w-full max-w-xs";

/** Long address / recipient / mono address — 28rem / 448px cap. */
export const FIELD_WIDTH_ADDRESS = "w-full max-w-md";

export const FIELD_WIDTH: Record<FieldWidth, string> = {
  default: FIELD_WIDTH_DEFAULT,
  address: FIELD_WIDTH_ADDRESS
};

export type FieldClassOpts = {
  theme: ThemeConfig;
  /** default = max-w-xs; address = max-w-md */
  width?: FieldWidth;
  className?: string;
};

/** Compose capped form field classes — never uncapped column-wide alone. */
export function fieldClass(opts: FieldClassOpts): string {
  const { theme, width = "default", className = "" } = opts;
  return [
    FIELD_BASE,
    FIELD_WIDTH[width],
    theme.border,
    theme.bg,
    theme.text,
    theme.rounded,
    className
  ]
    .filter(Boolean)
    .join(" ");
}

/** Label stack width follows the field cap; start-aligned under the label. */
export function fieldLabelClass(width: FieldWidth = "default"): string {
  return `flex flex-col gap-1 text-[11px] w-full ${
    width === "address" ? "max-w-md" : "max-w-xs"
  }`;
}
