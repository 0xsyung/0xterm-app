// @vitest-environment jsdom
/**
 * @file KytPanel.test.tsx
 * @description KYT panel open + fail-closed error surface (#170 Soft ACK)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import KytPanel, { canRunKyt, KytResultCard } from "./KytPanel";
import { KYT_ERROR, KYT_LEGAL_FOOTER, type KytResult } from "../../../lib/chainIntel";

const theme = THEMES.matrix;

const sample: KytResult = {
  mode: "heuristic v1",
  chainId: 1,
  chainName: "Ethereum",
  txHash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  from: "0x1111111111111111111111111111111111111111",
  to: "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
  valueWei: "0",
  blockNumber: 1,
  band: "high",
  hopsRequested: 3,
  truncated: false,
  hits: [
    {
      address: "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
      label: {
        address: "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
        chainId: "evm",
        kind: "ofac",
        name: "Tornado Cash",
        source: "ofac-sdn-advanced",
        sourceAsOf: "2024-05-16"
      },
      hop: 0,
      direction: "sent-to"
    }
  ],
  edges: [],
  ofacAsOf: "2024-05-16",
  labelSetVersion: "v1"
};

describe("KytPanel helpers", () => {
  it("canRunKyt gates on valid tx hash", () => {
    expect(
      canRunKyt({
        txHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      })
    ).toBe(true);
    expect(canRunKyt({ txHash: "0x1234" })).toBe(false);
    expect(
      canRunKyt({
        txHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        running: true
      })
    ).toBe(false);
  });
});

describe("KytPanel", () => {
  it("renders TXHASH + RUN (SIM/TRACE chrome)", () => {
    render(<KytPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Kyt" })).toBeTruthy();
    expect(screen.getByTestId("kyt-txhash")).toBeTruthy();
    expect(screen.getByTestId("kyt-run").textContent).toMatch(/RUN/i);
    expect(screen.getByText(/heuristic v1/i)).toBeTruthy();
  });

  it("surfaces missing-key catalog error in-panel (fail-closed)", async () => {
    const onRun = vi.fn().mockResolvedValue({
      ok: false,
      error: KYT_ERROR.no_hops_source
    });
    render(<KytPanel theme={theme} onClose={vi.fn()} onRun={onRun} />);
    fireEvent.change(screen.getByTestId("kyt-txhash"), {
      target: {
        value:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      }
    });
    fireEvent.click(screen.getByTestId("kyt-run"));
    expect((await screen.findByTestId("kyt-error")).textContent).toMatch(
      /Alchemy RPC|kyt set explorer/i
    );
    expect(screen.queryByTestId("kyt-result-card")).toBeNull();
  });

  it("result card shows heuristic badge, warn band, locked legal footer", () => {
    render(<KytResultCard data={sample} theme={theme} />);
    expect(screen.getByTestId("kyt-heuristic-badge").textContent).toBe(
      "heuristic v1"
    );
    expect(screen.getByTestId("kyt-band").textContent).toBe("high");
    expect(screen.getByTestId("kyt-legal-footer").textContent).toBe(
      KYT_LEGAL_FOOTER
    );
  });
});
