// @vitest-environment jsdom
/**
 * @file KyaPanel.test.tsx
 * @description KYA panel open + fail-closed (#170 Soft ACK)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import KyaPanel, { canRunKya, KyaResultCard } from "./KyaPanel";
import { KYA_ERROR, KYA_LEGAL_FOOTER, type KyaResult } from "../../../lib/chainIntel";

const theme = THEMES.matrix;

const sample: KyaResult = {
  mode: "heuristic v1",
  chainId: 1,
  chainName: "Ethereum",
  address: "0x1111111111111111111111111111111111111111",
  sampledTxCount: 0,
  truncated: false,
  nativeInWei: "0",
  nativeOutWei: "0",
  counterparties: [],
  subjectLabels: [],
  ofacAsOf: "2024-05-16",
  labelSetVersion: "v1",
  band: "clear"
};

describe("KyaPanel", () => {
  it("canRunKya gates on address", () => {
    expect(
      canRunKya({ address: "0x1111111111111111111111111111111111111111" })
    ).toBe(true);
    expect(canRunKya({ address: "" })).toBe(false);
  });

  it("renders ADDRESS + RUN; prefills defaultAddress", () => {
    render(
      <KyaPanel
        theme={theme}
        onClose={vi.fn()}
        onRun={vi.fn()}
        defaultAddress="0x1111111111111111111111111111111111111111"
      />
    );
    expect(screen.getByRole("dialog", { name: "Kya" })).toBeTruthy();
    expect(
      (screen.getByTestId("kya-address") as HTMLInputElement).value
    ).toBe("0x1111111111111111111111111111111111111111");
    expect(screen.getByTestId("kya-run").textContent).toMatch(/RUN/i);
  });

  it("surfaces no_source catalog error in-panel", async () => {
    const onRun = vi.fn().mockResolvedValue({
      ok: false,
      error: KYA_ERROR.no_source
    });
    render(<KyaPanel theme={theme} onClose={vi.fn()} onRun={onRun} />);
    fireEvent.change(screen.getByTestId("kya-address"), {
      target: { value: "0x1111111111111111111111111111111111111111" }
    });
    fireEvent.click(screen.getByTestId("kya-run"));
    expect((await screen.findByTestId("kya-error")).textContent).toMatch(
      /rpc alchemy|kyt set explorer/i
    );
  });

  it("result card has heuristic badge + locked KYA legal footer (no vendor claim)", () => {
    render(<KyaResultCard data={sample} theme={theme} />);
    expect(screen.getByTestId("kya-heuristic-badge").textContent).toBe(
      "heuristic v1"
    );
    expect(screen.getByTestId("kya-legal-footer").textContent).toBe(
      KYA_LEGAL_FOOTER
    );
  });
});
