/**
 * Shared viewport presets.
 * PR-A gates mobile; tablet/desktop reserved for PR-A.1.
 */
export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 }
} as const;

export type ViewportName = keyof typeof VIEWPORTS;
