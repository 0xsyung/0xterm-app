/**
 * @file scoring.ts
 * @description Heuristic v1 risk band from labeled hop hits (#16)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { KytHit, Label, RiskBand } from "./types";

/**
 * Highest band wins:
 * - any ofac ≤ hopsRequested → high
 * - mixer hop ≤ 2 → high; mixer hop 3–5 → caution
 * - cex/bridge hop ≤ 2 (no ofac/mixer) → caution
 * - else clear
 */
export function scoreKytHits(
  hits: KytHit[],
  hopsRequested: number
): RiskBand {
  let band: RiskBand = "clear";
  for (const hit of hits) {
    if (hit.hop > hopsRequested) continue;
    if (hit.label.kind === "ofac") return "high";
    if (hit.label.kind === "mixer") {
      if (hit.hop <= 2) return "high";
      band = "caution";
    }
    if (
      (hit.label.kind === "cex" || hit.label.kind === "bridge") &&
      hit.hop <= 2
    ) {
      if (band === "clear") band = "caution";
    }
  }
  return band;
}

/** Subject-address labels (KYA): ofac → high; mixer → high; cex/bridge → caution. */
export function scoreSubjectLabels(labels: Label[]): RiskBand {
  let band: RiskBand = "clear";
  for (const lab of labels) {
    if (lab.kind === "ofac" || lab.kind === "mixer") return "high";
    if (lab.kind === "cex" || lab.kind === "bridge") {
      if (band === "clear") band = "caution";
    }
  }
  return band;
}

export function clampHops(raw: number | undefined): number {
  const n = raw === undefined || Number.isNaN(raw) ? 3 : Math.floor(raw);
  if (n < 1 || n > 5) return -1;
  return n;
}
