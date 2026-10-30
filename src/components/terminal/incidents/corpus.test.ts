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

describe("incidents corpus (#268/#270/#272)", () => {
  it("ships Binance first by occurredAt desc, plus Soft ACK #270 backfill (5 total)", () => {
    expect(incidents.length).toBe(5);
    expect(incidents[0]?.id).toBe("binance-hot-wallet-2026-10-30");
    expect(getIncidentById("binance-hot-wallet-2026-10-30")?.title).toMatch(/Binance/i);
    expect(incidents.map((i) => i.id)).toEqual([
      "binance-hot-wallet-2026-10-30",
      "polymarket-debugbear-rum-2026-10-29",
      "hifi-finance-governance-2026-10-28",
      "zklink-nova-bridge-2026-10-28",
      "tranchepool-avalanche-2026-10-28"
    ]);
    for (let i = 1; i < incidents.length; i++) {
      expect(incidents[i - 1]!.occurredAt >= incidents[i]!.occurredAt).toBe(true);
    }
  });

  it("Soft ACK #270 four backfill statuses Soft-match Manager locks", () => {
    expect(getIncidentById("polymarket-debugbear-rum-2026-10-29")?.status).toBe("RESOLVED");
    expect(getIncidentById("zklink-nova-bridge-2026-10-28")?.status).toBe("CONTAINED");
    expect(getIncidentById("hifi-finance-governance-2026-10-28")?.status).toBe("UNRESOLVED");
    expect(getIncidentById("tranchepool-avalanche-2026-10-28")?.status).toBe("UNRESOLVED");
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

  it("sections follow Soft Design order and omit empty filler for every incident", () => {
    for (const inc of incidents) {
      const ids = inc.sections.map((s) => s.id);
      const orderIdx = ids.map((id) => INCIDENT_SECTION_ORDER.indexOf(id));
      expect(orderIdx.every((i) => i >= 0), inc.id).toBe(true);
      for (let i = 1; i < orderIdx.length; i++) {
        expect(orderIdx[i]).toBeGreaterThan(orderIdx[i - 1]);
      }
      for (const sec of inc.sections) {
        const has =
          sec.claims.length > 0 ||
          (sec.bullets?.length ?? 0) > 0 ||
          (sec.figures?.length ?? 0) > 0;
        expect(has, `${inc.id}:${sec.id}`).toBe(true);
      }
      const money = inc.sections.find((s) => s.id === "money");
      expect(money?.figures?.length, inc.id).toBeGreaterThan(0);
      for (const f of money!.figures!) {
        expect(["confirmed", "estimate"]).toContain(f.confidence);
        expect(f.sourceIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("pageIncidents uses Soft page size 8 and pages correctly (A′: 5 ≤ 8 → one page)", () => {
    expect(INCIDENT_PAGE_SIZE).toBe(8);
    expect(incidents.length).toBeLessThanOrEqual(INCIDENT_PAGE_SIZE);
    const one = pageIncidents(incidents, 0, INCIDENT_PAGE_SIZE);
    expect(one).toHaveLength(incidents.length);
    const padded = [
      ...incidents,
      ...Array.from({ length: 10 }, (_, i) => ({
        ...incidents[0]!,
        id: `extra-${i}`
      }))
    ];
    expect(padded.length).toBe(15);
    expect(pageIncidents(padded, 0, 8)).toHaveLength(8);
    expect(pageIncidents(padded, 1, 8)).toHaveLength(7);
    expect(incidentSourceMap(incidents[0]!).size).toBe(incidents[0]!.sources.length);
  });

  it("Binance status is ACTIVE containment at Soft ACK seed time", () => {
    expect(getIncidentById("binance-hot-wallet-2026-10-30")?.status).toBe("ACTIVE");
  });

  it("Soft ACK #272 Binance Soft-refresh: DevOps / no-key-leak / ~$6.3B est ≠ ~$3B freeze", () => {
    const binance = getIncidentById("binance-hot-wallet-2026-10-30")!;
    expect(binance.amountSummary).toMatch(/6\.3B/i);
    expect(binance.amountSummary).toMatch(/\$3B/i);
    const srcIds = new Set(binance.sources.map((s) => s.id));
    for (const id of [
      "binance-x-devops",
      "binance-x-freeze",
      "binance-x-cover",
      "binance-x-predict",
      "panews"
    ]) {
      expect(srcIds.has(id), id).toBe(true);
      expect(binance.sources.find((s) => s.id === id)?.url.startsWith("https://")).toBe(
        true
      );
    }
    // Soft-omit: blog slug Soft-seed returned error page at tip — not cited
    expect(binance.sources.some((s) => s.url.includes("Binance-Security-Incident-Update-2"))).toBe(
      false
    );
    const what = binance.sections.find((s) => s.id === "what")!;
    const whatText = what.claims.map((c) => c.text).join("\n");
    expect(whatText).toMatch(/DevOps/i);
    expect(whatText).toMatch(/service container/i);
    expect(whatText).toMatch(/no evidence of any wallet private-key leak/i);
    expect(whatText).toMatch(/Earlier analyst take|Soft-demoted|Soft-labeled/i);
    const money = binance.sections.find((s) => s.id === "money")!;
    const moneyText = [
      ...(money.claims?.map((c) => c.text) ?? []),
      ...(money.figures?.map((f) => `${f.label} ${f.amount}`) ?? [])
    ].join("\n");
    expect(moneyText).toMatch(/6\.3B/);
    expect(moneyText).toMatch(/SAFU/);
    expect(moneyText).toMatch(/Proof of Reserves|PoR/i);
    const officialEst = money.figures!.find((f) => /6\.3B/.test(f.amount));
    expect(officialEst?.confidence).toBe("estimate");
    const freeze = money.figures!.find(
      (f) => /verified funds frozen/i.test(f.label) || /~\$3B/.test(f.amount)
    );
    expect(freeze?.confidence).toBe("confirmed");
    const orgs = binance.sections.find((s) => s.id === "orgs")!;
    expect(orgs.claims.some((c) => /PREDICT/i.test(c.text))).toBe(true);
    // Soft Design A / Eng C: four backfill IDs Soft-hold untouched by this Soft ACK
    expect(incidents.map((i) => i.id).slice(1)).toEqual([
      "polymarket-debugbear-rum-2026-10-29",
      "hifi-finance-governance-2026-10-28",
      "zklink-nova-bridge-2026-10-28",
      "tranchepool-avalanche-2026-10-28"
    ]);
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
