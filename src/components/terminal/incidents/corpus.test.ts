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

describe("incidents corpus (#268/#270/#272/#275/#277)", () => {
  it("ships VergeX first by occurredAt desc, Soft ACK #277 + Soft ACK #275/#272/#270 hold (7 total)", () => {
    expect(incidents.length).toBe(7);
    expect(incidents[0]?.id).toBe("vergex-account-drain-2026-10-31");
    expect(getIncidentById("vergex-account-drain-2026-10-31")?.title).toMatch(/VergeX/i);
    expect(getIncidentById("flap-kintsu-stonkbrokers-dns-frontend-2026-10-31")?.title).toMatch(
      /Flap|Kintsu|StepDrainer/i
    );
    expect(getIncidentById("binance-hot-wallet-2026-10-30")?.title).toMatch(/Binance/i);
    expect(incidents.map((i) => i.id)).toEqual([
      "vergex-account-drain-2026-10-31",
      "flap-kintsu-stonkbrokers-dns-frontend-2026-10-31",
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

  it("pageIncidents uses Soft page size 8 and pages correctly (A′: 7 ≤ 8 → one page)", () => {
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
    expect(padded.length).toBe(17);
    expect(pageIncidents(padded, 0, 8)).toHaveLength(8);
    expect(pageIncidents(padded, 1, 8)).toHaveLength(8);
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
    // Soft Design A / Eng C: Soft ACK #272 Binance + Soft ACK #270 four backfill Soft-hold
    expect(incidents.map((i) => i.id).slice(2)).toEqual([
      "binance-hot-wallet-2026-10-30",
      "polymarket-debugbear-rum-2026-10-29",
      "hifi-finance-governance-2026-10-28",
      "zklink-nova-bridge-2026-10-28",
      "tranchepool-avalanche-2026-10-28"
    ]);
  });

  it("Soft ACK #275 Flap/Kintsu/StepDrainer ACTIVE: official URLs + residual Soft-label + prior five hold", () => {
    const flap = getIncidentById("flap-kintsu-stonkbrokers-dns-frontend-2026-10-31")!;
    expect(flap.status).toBe("ACTIVE");
    expect(flap.amountSummary).toMatch(/unconfirmed/i);
    const srcIds = new Set(flap.sources.map((s) => s.id));
    for (const id of [
      "flap-hijack",
      "flap-migrate",
      "flap-restore",
      "kintsu-hijack",
      "kintsu-vercel",
      "kintsu-restore-1",
      "kintsu-restore-2",
      "longbow-restore",
      "blockaid-trio",
      "blockaid-narrow",
      "blockaid-expand"
    ]) {
      expect(srcIds.has(id), id).toBe(true);
      expect(flap.sources.find((s) => s.id === id)?.url.startsWith("https://")).toBe(true);
    }
    expect(flap.sources.find((s) => s.id === "flap-hijack")?.url).toContain(
      "2116352828734050339"
    );
    expect(flap.sources.find((s) => s.id === "flap-migrate")?.url).toContain(
      "2116400269445509360"
    );
    expect(flap.sources.find((s) => s.id === "flap-restore")?.url).toContain(
      "2116433470276972590"
    );
    expect(flap.sources.find((s) => s.id === "kintsu-hijack")?.url).toContain(
      "2116373486234902587"
    );
    expect(flap.sources.find((s) => s.id === "kintsu-vercel")?.url).toContain(
      "2116382643017101513"
    );
    expect(flap.sources.find((s) => s.id === "blockaid-expand")?.url).toContain(
      "2116368762488107157"
    );
    expect(flap.sources.find((s) => s.id === "blockaid-trio")?.url).toContain(
      "2116354922128015441"
    );
    const what = flap.sections.find((s) => s.id === "what")!;
    const whatText = what.claims.map((c) => c.text).join("\n");
    expect(whatText).toMatch(/DNS/i);
    expect(whatText).toMatch(/Vercel Domains/i);
    expect(whatText).toMatch(/Step Drainer|StepDrainer/i);
    const status = flap.sections.find((s) => s.id === "status")!;
    const statusText = status.claims.map((c) => c.text).join("\n");
    expect(statusText).toMatch(/ACTIVE/i);
    expect(statusText).toMatch(/no all-clear/i);
    expect(statusText).toMatch(/OK to use|OK-to-use/i);
    expect(statusText).toMatch(/residual/i);
    const money = flap.sections.find((s) => s.id === "money")!;
    expect(money.figures!.some((f) => /Not disclosed/i.test(f.amount))).toBe(true);
    expect(money.figures!.some((f) => f.confidence === "confirmed")).toBe(true);
    expect(money.figures!.some((f) => f.confidence === "estimate")).toBe(true);
    // Soft Design A / Eng C: prior five Soft PASS deep-dives Soft-hold (after VergeX + Flap)
    expect(incidents.map((i) => i.id).slice(2)).toEqual([
      "binance-hot-wallet-2026-10-30",
      "polymarket-debugbear-rum-2026-10-29",
      "hifi-finance-governance-2026-10-28",
      "zklink-nova-bridge-2026-10-28",
      "tranchepool-avalanche-2026-10-28"
    ]);
    expect(collectUnsourcedClaimPaths(flap)).toEqual([]);
  });

  it("Soft ACK #277 VergeX CONTAINED: official URLs + early Tintin Soft-label + prior six hold", () => {
    const vx = getIncidentById("vergex-account-drain-2026-10-31")!;
    expect(vx.status).toBe("CONTAINED");
    expect(vx.amountSummary).toMatch(/3,?688\.58/);
    expect(vx.amountSummary).toMatch(/850/);
    const srcIds = new Set(vx.sources.map((s) => s.id));
    for (const id of [
      "vergex-x-ack",
      "slowmist-vergex",
      "odaily-early",
      "techflow-early",
      "tintin-sync",
      "tintin-refund"
    ]) {
      expect(srcIds.has(id), id).toBe(true);
      expect(vx.sources.find((s) => s.id === id)?.url.startsWith("https://")).toBe(true);
    }
    expect(vx.sources.find((s) => s.id === "vergex-x-ack")?.url).toContain(
      "2116549211110129781"
    );
    expect(vx.sources.find((s) => s.id === "slowmist-vergex")?.url).toContain(
      "hacked.slowmist.io"
    );
    expect(vx.sources.find((s) => s.id === "odaily-early")?.url).toContain(
      "2116541915634229416"
    );
    expect(vx.sources.find((s) => s.id === "techflow-early")?.url).toContain(
      "techflowpost.com"
    );
    const what = vx.sections.find((s) => s.id === "what")!;
    const whatText = what.claims.map((c) => c.text).join("\n");
    expect(whatText).toMatch(/withdrawal/i);
    expect(whatText).toMatch(/3,?688\.58/);
    expect(whatText).toMatch(/Unknown/i);
    const status = vx.sections.find((s) => s.id === "status")!;
    const statusText = status.claims.map((c) => c.text).join("\n");
    expect(statusText).toMatch(/CONTAINED/i);
    expect(statusText).not.toMatch(/Status RESOLVED/);
    expect(statusText).toMatch(/not RESOLVED|do not flip to RESOLVED/i);
    expect(statusText).toMatch(/staged|withdrawal reopen|method/i);
    const money = vx.sections.find((s) => s.id === "money")!;
    expect(money.figures!.some((f) => /3,?688\.58/.test(f.amount))).toBe(true);
    expect(money.figures!.some((f) => /850/.test(f.amount))).toBe(true);
    expect(money.figures!.some((f) => f.confidence === "confirmed")).toBe(true);
    expect(money.figures!.some((f) => f.confidence === "estimate")).toBe(true);
    const news = vx.sections.find((s) => s.id === "news")!;
    expect(news.claims.some((c) => /Tintin|850|TechFlow|Odaily/i.test(c.text))).toBe(true);
    // Soft Design A / Eng C: prior six Soft PASS deep-dives Soft-hold
    expect(incidents.map((i) => i.id).slice(1)).toEqual([
      "flap-kintsu-stonkbrokers-dns-frontend-2026-10-31",
      "binance-hot-wallet-2026-10-30",
      "polymarket-debugbear-rum-2026-10-29",
      "hifi-finance-governance-2026-10-28",
      "zklink-nova-bridge-2026-10-28",
      "tranchepool-avalanche-2026-10-28"
    ]);
    expect(collectUnsourcedClaimPaths(vx)).toEqual([]);
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
