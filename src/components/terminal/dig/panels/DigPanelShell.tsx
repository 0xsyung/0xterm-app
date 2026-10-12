/**
 * @file DigPanelShell.tsx
 * @description Shared frameless chrome for DEV dig panels (#166 Soft ACK)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, type ReactNode } from "react";
import type { ThemeConfig } from "../../types";

const TOUCH =
  "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

export function DigPanelShell({
  theme,
  title,
  subtitle,
  onClose,
  children,
  testId
}: {
  theme: ThemeConfig;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="w-full flex flex-col gap-3 min-h-0"
      data-testid={testId}
      role="dialog"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <span
            className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
          >
            {title}
          </span>
          {subtitle ? (
            <span className={`text-[10px] ${theme.muted} truncate`}>{subtitle}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title} panel`}
          className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${TOUCH}`}
          data-testid={`${testId || "dig-panel"}-close`}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

export function DigEmptyBody({
  theme,
  message,
  children
}: {
  theme: ThemeConfig;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`text-[10px] md:text-[11px] ${theme.muted}`}>{message}</div>
      {children}
    </div>
  );
}

export function DigPrimaryButton({
  theme,
  label,
  onClick,
  disabled,
  testId
}: {
  theme: ThemeConfig;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={!!disabled}
      className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer max-md:min-h-[44px] ${TOUCH} ${
        disabled ? "opacity-40" : ""
      }`}
      style={{ background: theme.phosphor, color: "#000000" }}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

export { TOUCH as DIG_PANEL_TOUCH };
