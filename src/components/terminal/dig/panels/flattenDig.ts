/**
 * @file flattenDig.ts
 * @description Flatten nested DigResult arrays for panel handlers (#166)
 */
import type { DigResult } from "../runDig";

export type DigResultLeaf = Exclude<DigResult, DigResult[]>;

export function flattenDig(result: DigResult): DigResultLeaf[] {
  if (Array.isArray(result)) {
    return result.flatMap((r) => flattenDig(r));
  }
  return [result];
}
