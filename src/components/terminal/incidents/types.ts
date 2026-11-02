/**
 * @file types.ts
 * @description Soft ACK #268 — typed FORENSIC incident-report model (hardcoded corpus)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

/** Soft-nice list/detail status badges (Design lock A). */
export type IncidentStatus =
  | "ACTIVE"
  | "CONTAINED"
  | "RESOLVED"
  | "UNRESOLVED";

/** Soft-label every money figure as confirmed vs estimate (Design lock B / Eng C). */
export type MoneyConfidence = "confirmed" | "estimate";

export type IncidentSource = {
  id: string;
  title: string;
  url: string;
};

/** Displayed fact that Soft-cites one or more source ids. */
export type SourcedClaim = {
  text: string;
  sourceIds: string[];
};

export type MoneyFigure = {
  label: string;
  amount: string;
  confidence: MoneyConfidence;
  sourceIds: string[];
};

/** Soft ACK #285 — FORENSIC detail Background Soft-block (protocol context Soft-before eight Soft-sections). */
export type IncidentProtocolType =
  | "DEX"
  | "lending"
  | "perps"
  | "bridge"
  | "NFT marketplace"
  | "CEX"
  | "L1"
  | "L2"
  | "wallet"
  | "mobile store"
  | "merchant infra"
  | "AI trading"
  | "other";

export type IncidentSizeMetric = {
  label: string;
  value: string;
  asOf?: string;
  sourceIds: string[];
  confidence: MoneyConfidence;
};

export type IncidentBackground = {
  protocolType: IncidentProtocolType | string;
  sizeMetrics?: IncidentSizeMetric[];
  notes?: SourcedClaim[];
};

export type IncidentSectionId =
  | "what"
  | "timeline"
  | "orgs"
  | "news"
  | "status"
  | "money"
  | "chains"
  | "people";

export type IncidentSection = {
  id: IncidentSectionId;
  title: string;
  /** Soft-order body claims; omit empty sections rather than filler. */
  claims: SourcedClaim[];
  /** Optional Soft-rows (timeline bullets). */
  bullets?: SourcedClaim[];
  /** Money section Soft-figures (confirmed vs estimate). */
  figures?: MoneyFigure[];
};

export type Incident = {
  id: string;
  title: string;
  /** ISO-8601 instant for Soft-readable date chrome. */
  occurredAt: string;
  status: IncidentStatus;
  /** Optional Soft-nice amount chip on list/detail header. */
  amountSummary?: string;
  chains: string[];
  /** Soft ACK #285 — detail-only Background Soft-block Soft-before eight Soft-sections. */
  background?: IncidentBackground;
  sources: IncidentSource[];
  sections: IncidentSection[];
};

export const INCIDENT_PAGE_SIZE = 8;

export const INCIDENT_SECTION_ORDER: IncidentSectionId[] = [
  "what",
  "timeline",
  "orgs",
  "news",
  "status",
  "money",
  "chains",
  "people"
];
