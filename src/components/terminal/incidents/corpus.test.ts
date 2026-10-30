/**
 * @file corpus.test.ts
 * @description Soft ACK #268 — incident corpus integrity + pagination helpers
 */
import { describe, expect, it } from "vitest";
import {
  collectUnsourcedClaimPaths,
  getIncidentById,
  incidentSourceMap,
  incidents,
  pageIncidents
} from "./corpus";
import { INCIDENT_PAGE_SIZE, INCIDENT_SECTION_ORDER } from "./types";

describe("incidents corpus (#268)", () => {
  it("ships Binance as the first hardcoded report", () => {
    expect(incidents.length).toBeGreaterThanOrEqual(1);
    expect(incidents[0]?.id).toBe("binance-hot-wallet-2026-10-30");
    expect(getIncidentById("binance-hot-wallet-2026-10-30")?.title).toMatch(/Binance/i);
  });

  it("every factual claim Soft-cites a known source URL", () => {
    for (const inc of incidents) {
      expect(inc.sources.length).toBeGreaterThan(0);
      for (const s of inc.sources) {
        expect(s.url.startsWith("https://")).toBe(true);
        expect(s.title.trim().length).toBeGreaterThan(0);
      }
      const bad = collectUnsourcedClaimPaths(inc);
      expect(bad, bad.join(", ")).toEqual([]);
    }
  });

  it("money figures are labeled confirmed vs estimate", () => {
    const binance = getIncidentById("binance-hot-wallet-2026-10-30");
    expect(binance).toBeTruthy();
    const money = binance!.sections.find((s) => s.id === "money");
    expect(money?.figures?.length).toBeGreaterThan(0);
    for (const f of money!.figures!) {
      expect(["confirmed", "estimate"]).toContain(f.confidence);
      expect(f.sourceIds.length).toBeGreaterThan(0);
    }
    const estimates = money!.figures!.filter((f) => f.confidence === "estimate");
    const confirmed = money!.figures!.filter((f) => f.confidence === "confirmed");
    expect(estimates.length).toBeGreaterThan(0);
    expect(confirmed.length).toBeGreaterThan(0);
  });

  it("sections follow Soft Design order and omit empty filler", () => {
    const binance = getIncidentById("binance-hot-wallet-2026-10-30")!;
    const ids = binance.sections.map((s) => s.id);
    const orderIdx = ids.map((id) => INCIDENT_SECTION_ORDER.indexOf(id));
    expect(orderIdx.every((i) => i >= 0)).toBe(true);
    for (let i = 1; i < orderIdx.length; i++) {
      expect(orderIdx[i]).toBeGreaterThan(orderIdx[i - 1]);
    }
    for (const sec of binance.sections) {
      const has =
        sec.claims.length > 0 ||
        (sec.bullets?.length ?? 0) > 0 ||
        (sec.figures?.length ?? 0) > 0;
      expect(has, sec.id).toBe(true);
    }
  });

  it("pageIncidents uses Soft page size 8 and pages correctly", () => {
    expect(INCIDENT_PAGE_SIZE).toBe(8);
    const one = pageIncidents(incidents, 0, INCIDENT_PAGE_SIZE);
    expect(one).toHaveLength(Math.min(incidents.length, INCIDENT_PAGE_SIZE));
    const padded = [
      ...incidents,
      ...Array.from({ length: 10 }, (_, i) => ({
        ...incidents[0]!,
        id: `extra-${i}`
      }))
    ];
    expect(pageIncidents(padded, 0, 8)).toHaveLength(8);
    expect(pageIncidents(padded, 1, 8)).toHaveLength(3);
    expect(incidentSourceMap(incidents[0]!).size).toBe(incidents[0]!.sources.length);
  });

  it("Binance status is ACTIVE containment at Soft ACK seed time", () => {
    expect(getIncidentById("binance-hot-wallet-2026-10-30")?.status).toBe("ACTIVE");
  });

  it("collectUnsourcedClaimPaths flags empty or unknown source ids", () => {
    const base = getIncidentById("binance-hot-wallet-2026-10-30")!;
    const bad: typeof base = {
      ...base,
      id: "bad",
      sections: [
        {
          id: "what",
          title: "What",
          claims: [{ text: "unsourced", sourceIds: [] }],
          bullets: [{ text: "unknown", sourceIds: ["nope"] }],
          figures: [
            {
              label: "x",
              amount: "1",
              confidence: "estimate",
              sourceIds: ["bbc", "missing"]
            }
          ]
        }
      ]
    };
    const paths = collectUnsourcedClaimPaths(bad);
    expect(paths.length).toBe(3);
  });
});
