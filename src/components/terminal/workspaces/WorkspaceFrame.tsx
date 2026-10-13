/**
 * @file WorkspaceFrame.tsx
 * @description Bordered frame + segmented sub-tabs for workspace modes, mirroring SOCIAL (#140/#145)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { SegmentButton } from "../widgets/SegmentButton";

export function WorkspaceFrame({
  theme,
  subTabs,
  activeSubTab,
  onSubTabChange,
  children
}: {
  theme: ThemeConfig;
  subTabs: { id: string; label: string }[];
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
  children: React.ReactNode;
}) {
  const radius = "rounded-none";

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden pt-2">
      {/* #202: NavStrip-style nowrap + overflow-x-auto on max-md; solid bg; mb-2 before card */}
      <div
        className={`flex flex-nowrap items-center gap-1.5 shrink-0 mb-2 max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden ${theme.bg}`}
        data-testid="workspace-sub-tabs"
      >
        {subTabs.map((t) => (
          <SegmentButton
            key={t.id}
            label={t.label}
            active={activeSubTab === t.id}
            theme={theme}
            quiet
            onClick={() => onSubTabChange(t.id)}
          />
        ))}
      </div>
      <div
        className={`flex-1 min-h-0 overflow-y-auto border ${theme.border} ${theme.cardBg} ${radius} p-3 text-xs space-y-2`}
      >
        {children}
      </div>
    </div>
  );
}
