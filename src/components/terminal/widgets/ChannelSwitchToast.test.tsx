// @vitest-environment jsdom
/**
 * @file ChannelSwitchToast.test.tsx
 * @description Out-of-CONSOLE channel-switch toast chrome (#180)
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { THEMES } from "../constants";
import ChannelSwitchToast from "./ChannelSwitchToast";

const theme = THEMES.matrix;

describe("ChannelSwitchToast (#180)", () => {
  it("renders CONSOLE-log-style copy with theme chrome and z-24", () => {
    const { container } = render(
      <ChannelSwitchToast
        theme={theme}
        themeKey="matrix"
        text="[✓] Active channel: lobby · Sepolia"
        promptClearancePx={100}
      />
    );
    const el = screen.getByTestId("channel-switch-toast");
    expect(el.textContent).toBe("[✓] Active channel: lobby · Sepolia");
    expect(el.getAttribute("role")).toBe("status");
    expect(el.className).toMatch(/z-\[24\]/);
    expect(el.className).toMatch(/font-mono/);
    expect(el.className).toMatch(/text-\[11px\]/);
    expect(el.className).toMatch(theme.border);
    expect(el.className).toMatch(theme.cardBg);
    expect(el.className).toMatch(theme.text);
    expect(el.className).toMatch(/rounded-none/);
    expect(el.style.bottom).toBe("172px");
    expect(el.style.right).toBe("12px");
    expect(el.style.borderLeftColor).toMatch(/rgb\(0,\s*255,\s*102\)|#00ff66/i);
    // pointer-events-none so Esc/× and bubble stay interactive
    expect(el.className).toMatch(/pointer-events-none/);
    expect(container.querySelector("[data-testid='channel-switch-toast']")).toBeTruthy();
  });

  it("uses soft radius on macintosh theme", () => {
    render(
      <ChannelSwitchToast
        theme={THEMES.macintosh}
        themeKey="macintosh"
        text="[✓] Active channel: lobby · Sepolia — network → SEPOLIA"
        promptClearancePx={0}
      />
    );
    const el = screen.getByTestId("channel-switch-toast");
    expect(el.className).toMatch(THEMES.macintosh.rounded);
    expect(el.style.bottom).toBe("72px");
  });
});
