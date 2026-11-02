// @vitest-environment jsdom
/**
 * @file IncidentsPanel.test.tsx
 * @description Soft ACK #268 — list/detail Soft-chrome + source links + pagination
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { THEMES } from "../constants";
import IncidentsPanel from "./IncidentsPanel";
import { incidents } from "./corpus";
import type { Incident } from "./types";

const theme = THEMES.matrix;

function makeExtra(n: number): Incident[] {
  return Array.from({ length: n }, (_, i) => ({
    ...incidents[0]!,
    id: `extra-incident-${i}`,
    title: `Extra incident ${i}`
  }));
}

describe("IncidentsPanel (#268/#270/#275/#277/#279/#281/#282/#284/#283/#285/#291/#296)", () => {
  it("renders Soft Design A′ list: page-1 rows, b14g first, pagination shown (12 > page size 8; Soft ACK #291 BTCPay ACTIVE Update)", () => {
    const onClose = vi.fn();
    render(<IncidentsPanel theme={theme} onClose={onClose} />);
    expect(screen.getByTestId("incidents-panel")).toBeTruthy();
    expect(screen.getByTestId("incident-list")).toBeTruthy();
    expect(
      screen.getByTestId("incident-row-b14g-core-hardfork-recovery-2026-11-02")
    ).toBeTruthy();
    expect(
      screen.getByTestId("incident-status-b14g-core-hardfork-recovery-2026-11-02")
        .textContent
    ).toMatch(/CONTAINED/i);
    expect(
      screen.getByTestId("incident-row-btcpay-server-hot-wallet-sweeps-2026-11-01")
    ).toBeTruthy();
    expect(
      screen.getByTestId(
        "incident-status-btcpay-server-hot-wallet-sweeps-2026-11-01"
      ).textContent
    ).toMatch(/ACTIVE/i);
    expect(
      screen.getByTestId(
        "incident-row-solana-mobile-skr-claim-dapp-store-phishing-2026-11-01"
      )
    ).toBeTruthy();
    expect(
      screen.getByTestId(
        "incident-status-solana-mobile-skr-claim-dapp-store-phishing-2026-11-01"
      ).textContent
    ).toMatch(/CONTAINED/i);
    expect(
      screen.getByTestId("incident-row-talis-protocol-injective-nft-exploit-2026-10-31")
    ).toBeTruthy();
    expect(
      screen.getByTestId("incident-row-vergex-account-drain-2026-10-31")
    ).toBeTruthy();
    expect(
      screen.getByTestId("incident-row-flap-kintsu-stonkbrokers-dns-frontend-2026-10-31")
    ).toBeTruthy();
    expect(
      screen.getByTestId(
        "incident-row-threshold-tbtc-mint-redeem-pause-cve-2026-98432-2026-10-30"
      )
    ).toBeTruthy();
    expect(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    ).toBeTruthy();
    // Soft Design A′: 12 > page size 8 → page 1 shows 8; polymarket+older on page 2
    expect(screen.queryByTestId("incident-row-polymarket-debugbear-rum-2026-10-29")).toBeNull();
    expect(screen.queryByTestId("incident-row-hifi-finance-governance-2026-10-28")).toBeNull();
    expect(screen.getByText(/12 reports/i)).toBeTruthy();
    expect(screen.getByTestId("incident-pagination")).toBeTruthy();
  });

  it("opens detail with Soft sections and source URLs; BACK returns to list", () => {
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    const detail = screen.getByTestId("incident-detail");
    expect(detail).toBeTruthy();
    expect(screen.getByTestId("incident-section-what")).toBeTruthy();
    expect(screen.getByTestId("incident-section-timeline")).toBeTruthy();
    expect(screen.getByTestId("incident-section-money")).toBeTruthy();
    expect(screen.getByTestId("incident-sources-index")).toBeTruthy();
    const links = within(detail).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(a.getAttribute("href")?.startsWith("https://")).toBe(true);
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
    }
    fireEvent.click(screen.getByTestId("incident-back"));
    expect(screen.getByTestId("incident-list")).toBeTruthy();
    expect(screen.queryByTestId("incident-detail")).toBeNull();
  });

  it("Soft ACK #285 Background Soft-renders Soft-sourced size Soft-metrics Soft-when Soft-present", () => {
    const withMetrics: Incident[] = [
      {
        ...incidents[0]!,
        id: "bg-metrics",
        background: {
          protocolType: "bridge",
          sizeMetrics: [
            {
              label: "TVL",
              value: "$1.0B",
              asOf: "2026-11-01",
              confidence: "estimate",
              sourceIds: [incidents[0]!.sources[0]!.id]
            }
          ],
          notes: [
            {
              text: "Example Soft-sourced Soft-size Soft-metric Soft-row.",
              sourceIds: [incidents[0]!.sources[0]!.id]
            }
          ]
        }
      }
    ];
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} corpus={withMetrics} />);
    fireEvent.click(screen.getByTestId("incident-row-bg-metrics"));
    expect(screen.getByTestId("incident-background-metric-0").textContent).toMatch(/TVL/);
    expect(screen.getByTestId("incident-background-metric-0").textContent).toMatch(/\$1\.0B/);
    expect(screen.getByTestId("incident-background-metric-0").textContent).toMatch(/estimate/i);
    expect(screen.getByTestId("incident-background-note-0")).toBeTruthy();
  });

  it("Soft ACK #285 renders BACKGROUND Soft-block Soft-after header Soft-before What", () => {
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByTestId("incident-row-talis-protocol-injective-nft-exploit-2026-10-31")
    );
    const detail = screen.getByTestId("incident-detail");
    const bg = screen.getByTestId("incident-section-background");
    const what = screen.getByTestId("incident-section-what");
    expect(bg).toBeTruthy();
    expect(screen.getByTestId("incident-background-protocol-type").textContent).toMatch(
      /NFT marketplace/i
    );
    expect(within(bg).getByText(/BACKGROUND/i)).toBeTruthy();
    // Soft-order Soft-lock: Background Soft-node Soft-before What Soft-in Soft-detail Soft-DOM
    const children = Array.from(detail.children);
    const bgIdx = children.indexOf(bg);
    const whatIdx = children.indexOf(what);
    expect(bgIdx).toBeGreaterThan(-1);
    expect(whatIdx).toBeGreaterThan(bgIdx);
  });

  it("Escape on detail returns to list; Escape on list closes panel", () => {
    const onClose = vi.fn();
    render(<IncidentsPanel theme={theme} onClose={onClose} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    expect(screen.getByTestId("incident-detail")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("incident-list")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows PREV/NEXT Soft-chrome when corpus exceeds page size 8", () => {
    const corpus = [...incidents, ...makeExtra(10)];
    render(
      <IncidentsPanel theme={theme} onClose={vi.fn()} corpus={corpus} pageSize={8} />
    );
    expect(screen.getByTestId("incident-pagination")).toBeTruthy();
    expect(screen.getByTestId("incident-next")).toBeTruthy();
    fireEvent.click(screen.getByTestId("incident-next"));
    expect(screen.getByText(/page 2/i)).toBeTruthy();
  });

  it("money Soft-figures expose confirmed vs estimate labels", () => {
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    const money = screen.getByTestId("incident-section-money");
    expect(within(money).getAllByText(/confirmed/i).length).toBeGreaterThan(0);
    expect(within(money).getAllByText(/estimate/i).length).toBeGreaterThan(0);
  });

  it("renders CONTAINED/RESOLVED/UNRESOLVED badge tones and invalid date fallback", () => {
    const variants: Incident[] = [
      { ...incidents[0]!, id: "a", status: "CONTAINED", title: "Contained", occurredAt: "not-a-date" },
      { ...incidents[0]!, id: "b", status: "RESOLVED", title: "Resolved", occurredAt: "2026-01-01T00:00:00.000Z" },
      { ...incidents[0]!, id: "c", status: "UNRESOLVED", title: "Unresolved", occurredAt: "2026-01-02T00:00:00.000Z" }
    ];
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} corpus={variants} />);
    expect(screen.getByTestId("incident-status-a").textContent).toMatch(/CONTAINED/);
    expect(screen.getByTestId("incident-status-b").textContent).toMatch(/RESOLVED/);
    expect(screen.getByTestId("incident-status-c").textContent).toMatch(/UNRESOLVED/);
    expect(screen.getByTestId("incident-row-a").textContent).toContain("not-a-date");
  });

  it("PREV Soft-chrome returns to page 1; empty corpus Soft-copy", () => {
    const corpus = [...incidents, ...makeExtra(10)];
    render(
      <IncidentsPanel theme={theme} onClose={vi.fn()} corpus={corpus} pageSize={8} />
    );
    fireEvent.click(screen.getByTestId("incident-next"));
    fireEvent.click(screen.getByTestId("incident-prev"));
    expect(screen.getByText(/page 1/i)).toBeTruthy();
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} corpus={[]} />);
    expect(screen.getByText(/No incident reports yet/i)).toBeTruthy();
  });

  it("source Soft-cite stopPropagation does not leave list when clicked on detail", () => {
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    const cite = screen.getAllByTestId(/incident-source-/)[0];
    fireEvent.click(cite);
    expect(screen.getByTestId("incident-detail")).toBeTruthy();
  });

  it("Soft ACK #283 detail type Soft-scale Soft-locks (≥ text-xs body; muted source chips)", () => {
    render(<IncidentsPanel theme={theme} onClose={vi.fn()} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    const what = screen.getByTestId("incident-section-what");
    const claim = what.querySelector("p");
    expect(claim?.className).toMatch(/\btext-xs\b/);
    expect(claim?.className).toMatch(/\bmd:text-sm\b/);
    expect(claim?.className.includes("text-[10px]")).toBe(false);
    const h3 = what.querySelector("h3");
    expect(h3?.className.includes("text-[11px]")).toBe(true);
    expect(h3?.className).toMatch(/\bmd:text-xs\b/);
    const title = screen.getByTestId("incident-detail").querySelector("h2");
    expect(title?.className).toMatch(/\btext-xs\b/);
    expect(title?.className).toMatch(/\bmd:text-sm\b/);
    const cite = screen.getAllByTestId(/incident-source-/)[0];
    expect(cite.className.includes("text-[10px]")).toBe(true);
    // Soft-lock: inline [source] chips use theme.muted (matrix muted may Soft-share phosphor hex + /opacity)
    expect(cite.className).toContain(theme.muted);
    const detail = screen.getByTestId("incident-detail");
    expect(detail.className).toMatch(/\bgap-4\b/);
  });

  it("DigPanelShell Escape path clears detail via smart onClose", () => {
    const onClose = vi.fn();
    render(<IncidentsPanel theme={theme} onClose={onClose} />);
    fireEvent.click(
      screen.getByTestId("incident-row-binance-hot-wallet-2026-10-30")
    );
    // DigPanelShell listens on window keydown
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("incident-list")).toBeTruthy();
  });
});
