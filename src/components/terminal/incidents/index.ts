/**
 * @file index.ts
 * @description FORENSIC incident reports (#268)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
export { default as IncidentsPanel } from "./IncidentsPanel";
export {
  incidents,
  getIncidentById,
  pageIncidents,
  incidentSourceMap,
  collectUnsourcedClaimPaths
} from "./corpus";
export type {
  Incident,
  IncidentStatus,
  IncidentSection,
  IncidentSource,
  SourcedClaim,
  MoneyFigure,
  MoneyConfidence,
  IncidentSectionId
} from "./types";
export { INCIDENT_PAGE_SIZE, INCIDENT_SECTION_ORDER } from "./types";
