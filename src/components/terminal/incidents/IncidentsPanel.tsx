/**
 * @file IncidentsPanel.tsx
 * @description FORENSIC REPORTS · INCIDENTS — Soft ACK #268 list → detail Soft-chrome
 * Soft Design A–B: FeedList/DigPanelShell/NewsPanel language; page size 8; BACK + Escape.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useMemo, useState } from "react";
import type { ThemeConfig } from "../types";
import { DigPanelShell } from "../dig/panels/DigPanelShell";
import {
  incidents as defaultIncidents,
  incidentSourceMap,
  pageIncidents
} from "./corpus";
import {
  INCIDENT_PAGE_SIZE,
  type Incident,
  type IncidentStatus,
  type MoneyConfidence
} from "./types";

const TOUCH =
  "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";
const TAP_ROW =
  "pointer-coarse:min-h-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px] min-h-[44px] w-full text-left";

function statusBadgeClass(status: IncidentStatus, theme: ThemeConfig): string {
  if (status === "ACTIVE" || status === "UNRESOLVED") {
    return theme.warn || theme.muted;
  }
  if (status === "CONTAINED") return theme.primary;
  return theme.muted;
}

function confidenceLabel(c: MoneyConfidence): string {
  return c === "confirmed" ? "confirmed" : "estimate";
}

function formatIncidentDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    });
  } catch {
    return iso;
  }
}

function SourceCite({
  theme,
  ids,
  byId
}: {
  theme: ThemeConfig;
  ids: string[];
  byId: Map<string, Incident["sources"][number]>;
}) {
  const links = ids
    .map((id) => byId.get(id))
    .filter((s): s is Incident["sources"][number] => !!s);
  if (!links.length) return null;
  return (
    <span className={`inline-flex flex-wrap gap-x-1.5 gap-y-0.5 ml-1 align-baseline`}>
      {links.map((s) => (
        <a
          key={s.id}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all [overflow-wrap:anywhere] ${theme.primary} ${TOUCH} inline-flex items-center text-[10px]`}
          data-testid={`incident-source-${s.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          [source]
        </a>
      ))}
    </span>
  );
}

function IncidentListRow({
  theme,
  incident,
  onOpen
}: {
  theme: ThemeConfig;
  incident: Incident;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${TAP_ROW} px-3 py-2 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.text} cursor-pointer flex flex-col gap-1`}
      data-testid={`incident-row-${incident.id}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${theme.border} ${statusBadgeClass(
            incident.status,
            theme
          )}`}
          data-testid={`incident-status-${incident.id}`}
        >
          {incident.status}
        </span>
        <span className={`font-bold text-[10px] md:text-[11px] ${theme.primary} [overflow-wrap:anywhere]`}>
          {incident.title}
        </span>
      </div>
      <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] ${theme.muted}`}>
        <span className="tabular-nums">{formatIncidentDate(incident.occurredAt)}</span>
        {incident.amountSummary ? (
          <span
            className={`px-1.5 py-0.5 border ${theme.border} ${theme.text} [overflow-wrap:anywhere]`}
            data-testid={`incident-amount-${incident.id}`}
          >
            {incident.amountSummary}
          </span>
        ) : null}
        {incident.chains.map((c) => (
          <span
            key={c}
            className={`px-1.5 py-0.5 border ${theme.border} uppercase tracking-wide`}
          >
            {c}
          </span>
        ))}
      </div>
    </button>
  );
}

function IncidentDetail({
  theme,
  incident,
  onBack
}: {
  theme: ThemeConfig;
  incident: Incident;
  onBack: () => void;
}) {
  const byId = useMemo(() => incidentSourceMap(incident), [incident]);
  const sections = incident.sections.filter(
    (s) =>
      s.claims.length > 0 ||
      (s.bullets && s.bullets.length > 0) ||
      (s.figures && s.figures.length > 0)
  );

  return (
    <div className="flex flex-col gap-3 min-h-0" data-testid="incident-detail">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className={`uppercase tracking-widest text-[10px] font-bold border ${theme.border} px-2.5 py-1.5 cursor-pointer ${theme.primary} ${TOUCH}`}
          data-testid="incident-back"
        >
          BACK
        </button>
        <span className={`text-[10px] ${theme.muted}`}>list</span>
      </div>

      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${theme.border} ${statusBadgeClass(
              incident.status,
              theme
            )}`}
          >
            {incident.status}
          </span>
          <h2
            className={`uppercase text-[10px] md:text-[11px] tracking-widest font-bold ${theme.primary} [overflow-wrap:anywhere]`}
          >
            {incident.title}
          </h2>
        </div>
        <div className={`text-[10px] tabular-nums ${theme.muted}`}>
          {formatIncidentDate(incident.occurredAt)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {incident.amountSummary ? (
            <span className={`text-[10px] px-1.5 py-0.5 border ${theme.border} ${theme.text} [overflow-wrap:anywhere]`}>
              {incident.amountSummary}
            </span>
          ) : null}
          {incident.chains.map((c) => (
            <span
              key={c}
              className={`text-[10px] px-1.5 py-0.5 border ${theme.border} ${theme.muted} uppercase tracking-wide`}
            >
              {c}
            </span>
          ))}
        </div>
      </header>

      {sections.map((sec) => (
        <section
          key={sec.id}
          className="flex flex-col gap-1.5"
          data-testid={`incident-section-${sec.id}`}
        >
          <h3
            className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
          >
            {sec.title}
          </h3>
          {sec.claims.map((c, i) => (
            <p
              key={`c-${i}`}
              className={`text-[10px] md:text-[11px] ${theme.text} [overflow-wrap:anywhere] leading-relaxed`}
            >
              {c.text}
              <SourceCite theme={theme} ids={c.sourceIds} byId={byId} />
            </p>
          ))}
          {sec.bullets && sec.bullets.length > 0 ? (
            <ul className="list-none flex flex-col gap-1.5 pl-0 m-0">
              {sec.bullets.map((b, i) => (
                <li
                  key={`b-${i}`}
                  className={`text-[10px] md:text-[11px] ${theme.text} [overflow-wrap:anywhere] leading-relaxed border-l ${theme.border} pl-2`}
                >
                  {b.text}
                  <SourceCite theme={theme} ids={b.sourceIds} byId={byId} />
                </li>
              ))}
            </ul>
          ) : null}
          {sec.figures && sec.figures.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {sec.figures.map((f, i) => (
                <div
                  key={`f-${i}`}
                  className={`px-2 py-1.5 border ${theme.border} ${theme.cardBg} ${theme.rounded} text-[10px] md:text-[11px]`}
                  data-testid={`incident-figure-${i}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={theme.muted}>{f.label}</span>
                    <span
                      className={`uppercase text-[9px] tracking-wider px-1 border ${theme.border} ${
                        f.confidence === "confirmed" ? theme.primary : theme.warn || theme.muted
                      }`}
                    >
                      {confidenceLabel(f.confidence)}
                    </span>
                  </div>
                  <div className={`${theme.text} [overflow-wrap:anywhere] mt-0.5`}>
                    {f.amount}
                    <SourceCite theme={theme} ids={f.sourceIds} byId={byId} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ))}

      <section className="flex flex-col gap-1" data-testid="incident-sources-index">
        <h3 className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}>
          Sources
        </h3>
        <ul className="list-none flex flex-col gap-1 pl-0 m-0">
          {incident.sources.map((s) => (
            <li key={s.id} className="min-h-[44px] flex items-center">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[10px] underline break-all [overflow-wrap:anywhere] ${theme.primary} ${TOUCH} py-2`}
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function IncidentsPanel({
  theme,
  onClose,
  corpus = defaultIncidents,
  pageSize = INCIDENT_PAGE_SIZE,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  /** Inject for tests; production uses in-repo incidents[]. */
  corpus?: Incident[];
  pageSize?: number;
  frameless?: boolean;
}) {
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const total = corpus.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = pageIncidents(corpus, safePage, pageSize);
  const showPagination = total > pageSize;
  const selected = selectedId
    ? corpus.find((i) => i.id === selectedId) ?? null
    : null;

  // Escape: DigPanelShell → smart onClose (detail → list; list → panel close).

  return (
    <div
      className={`w-full flex flex-col gap-3 min-h-0 ${
        frameless ? "" : `p-3 md:p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="incidents-panel"
    >
      <DigPanelShell
        theme={theme}
        title="INCIDENTS"
        subtitle="FORENSIC · REPORTS"
        onClose={() => {
          if (selectedId) {
            setSelectedId(null);
            return;
          }
          onClose();
        }}
        testId="incidents-shell"
      >
        {selected ? (
          <IncidentDetail
            theme={theme}
            incident={selected}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-col gap-2" data-testid="incident-list">
            <div className={`text-[10px] ${theme.muted}`}>
              {total === 0
                ? "No incident reports yet."
                : `${total} report${total === 1 ? "" : "s"} · sourced deep-dives`}
            </div>
            <div className="flex flex-col gap-1.5">
              {pageItems.map((inc) => (
                <IncidentListRow
                  key={inc.id}
                  theme={theme}
                  incident={inc}
                  onOpen={() => setSelectedId(inc.id)}
                />
              ))}
            </div>
            {showPagination ? (
              <div
                className={`flex items-center gap-3 ${theme.muted}`}
                data-testid="incident-pagination"
              >
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage <= 0}
                  className={`uppercase text-[10px] underline cursor-pointer ${theme.primary} ${TOUCH} ${
                    safePage <= 0 ? "opacity-40 cursor-default" : ""
                  }`}
                  data-testid="incident-prev"
                >
                  ‹ prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className={`uppercase text-[10px] underline cursor-pointer ${theme.primary} ${TOUCH} ${
                    safePage >= pageCount - 1 ? "opacity-40 cursor-default" : ""
                  }`}
                  data-testid="incident-next"
                >
                  next ›
                </button>
                <span className="text-[10px] tabular-nums">
                  page {safePage + 1} / {pageCount}
                </span>
              </div>
            ) : null}
          </div>
        )}
        <div className="h-4 shrink-0" aria-hidden data-testid="incidents-end-pad" />
      </DigPanelShell>
    </div>
  );
}
