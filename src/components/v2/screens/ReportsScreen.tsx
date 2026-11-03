/**
 * @file ReportsScreen.tsx
 * @description V2 Reports R1–R3 — reuse V1 incidents chrome (#295 H)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "@/components/terminal/types";
import IncidentsPanel from "@/components/terminal/incidents/IncidentsPanel";

export default function ReportsScreen({ theme }: { theme: ThemeConfig }) {
  return (
    <section
      data-testid="v2-reports"
      className={`flex flex-col min-h-0 flex-1 ${theme.text}`}
    >
      <div className="px-4 pt-4">
        <h1 className={`text-lg font-bold ${theme.primary}`}>Reports</h1>
        <p className={`text-[11px] mb-2 ${theme.muted}`}>
          Incident reports — Background-first detail, eight sections.
        </p>
      </div>
      <div className="flex-1 min-h-0 px-2 pb-4">
        <IncidentsPanel theme={theme} onClose={() => undefined} frameless />
      </div>
    </section>
  );
}
