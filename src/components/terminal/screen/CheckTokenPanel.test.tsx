// @vitest-environment jsdom
/**
 * @file CheckTokenPanel.test.tsx
 * @description CHECK TOKEN forensic panel — not DigPanelShell (#170 Soft ACK)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import CheckTokenPanel, { canCheckToken } from "./CheckTokenPanel";

const theme = THEMES.matrix;

describe("CheckTokenPanel", () => {
  it("canCheckToken gates on address", () => {
    expect(
      canCheckToken({
        address: "0x1111111111111111111111111111111111111111"
      })
    ).toBe(true);
    expect(canCheckToken({ address: "" })).toBe(false);
  });

  it("renders ADDRESS + CHECK CTA (forensic chrome, not dig-check)", () => {
    render(
      <CheckTokenPanel theme={theme} onClose={vi.fn()} onCheck={vi.fn()} />
    );
    expect(screen.getByRole("dialog", { name: "Check Token" })).toBeTruthy();
    expect(screen.getByTestId("check-token-panel")).toBeTruthy();
    expect(screen.queryByTestId("dig-check-panel")).toBeNull();
    expect(screen.getByTestId("check-token-check").textContent).toMatch(
      /CHECK/i
    );
    expect(screen.queryByTestId("kyt-heuristic-badge")).toBeNull();
  });

  it("dispatches onCheck and renders result without heuristic badge", async () => {
    const onCheck = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        address: "0x1111111111111111111111111111111111111111",
        chainName: "Base",
        lines: ["[✓] ERC-20 via ERC-165"]
      }
    });
    render(
      <CheckTokenPanel theme={theme} onClose={vi.fn()} onCheck={onCheck} />
    );
    fireEvent.change(screen.getByTestId("check-token-address"), {
      target: { value: "0x1111111111111111111111111111111111111111" }
    });
    fireEvent.click(screen.getByTestId("check-token-check"));
    expect(await screen.findByTestId("check-token-result-card")).toBeTruthy();
    expect(screen.getByText(/ABI \/ ERC-165/i)).toBeTruthy();
    expect(screen.queryByText(/heuristic v1/i)).toBeNull();
  });
});
