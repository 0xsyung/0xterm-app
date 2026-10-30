/**
 * @file corpus.ts
 * @description Soft ACK #268 — in-repo incidents[] (no CMS/API). Binance first.
 * Every claim Soft-cites a verified source URL. Re-verified Eng 2026-10-30 HKT.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

import type { Incident } from "./types";

/**
 * Hardcoded incident corpus. v1 ships one report; past-incident backfill Soft-ACKs later.
 * Do not invent facts — omit unverifiable seed claims.
 */
export const incidents: Incident[] = [
  {
    id: "binance-hot-wallet-2026-10-30",
    title: "Binance hot-wallet drain — potential security issue",
    occurredAt: "2026-10-29T20:24:00.000Z",
    status: "ACTIVE",
    amountSummary: "Freezes ~$2.5B–$3B+ (confirmed); stolen totals unconfirmed",
    chains: ["Ethereum", "Bitcoin", "Tron", "Arbitrum", "Optimism", "Avalanche"],
    sources: [
      {
        id: "bbc",
        title: "BBC — Crypto worth billions frozen after suspected Binance hack",
        url: "https://www.bbc.com/news/articles/cwg7xp8kx4v5o"
      },
      {
        id: "ap",
        title: "AP — Binance flags potential security incident; firms freeze $2.5B+",
        url: "https://apnews.com/article/binance-cryptocurrency-security-39cda8ceb8095e036334a18549d3d20d"
      },
      {
        id: "coindesk",
        title: "CoinDesk — Hack drains key reserve wallets; EIP-7702 sweep",
        url: "https://www.coindesk.com/business/2026/10/30/binance-hack-drained-wallets-backing-customer-assets-reserve-data-shows"
      },
      {
        id: "techcrunch",
        title: "TechCrunch — Binance pauses withdrawals amid suspected theft",
        url: "https://techcrunch.com/2026/10/29/binance-pauses-withdrawals-as-hackers-suspected-of-stealing-billions-in-crypto/"
      },
      {
        id: "cyberdaily",
        title: "Cyberdaily — Official Binance X updates (freeze total, cover losses)",
        url: "https://www.cyberdaily.au/security/14375-binance-investigating-potential-security-incident-as-wallets-drained-of-billions"
      },
      {
        id: "nbc",
        title: "NBC News — Binance mounts urgent response; cover-all-losses pledge",
        url: "https://www.nbcnews.com/business/markets/binance-hack-tether-circle-stablecoins-rcna606445"
      },
      {
        id: "aljazeera",
        title: "Al Jazeera — Binance says $3bn frozen amid potential security issue",
        url: "https://www.aljazeera.com/economy/2026/10/30/binance-says-2-54bn-in-crypto-funds-frozen-amid-potential-security-issue"
      },
      {
        id: "cointelegraph-blockaid",
        title: "Cointelegraph — Blockaid: key misuse / signing infra, not raw key theft",
        url: "https://cointelegraph.com/news/binance-hack-may-involve-private-key-misuse-not-theft-blockaid-ceo"
      },
      {
        id: "slowmist-techflow",
        title: "TechFlow — SlowMist Cos: EIP-7702 facilitator, not root cause",
        url: "https://www.techflowpost.com/en-US/newsletter/141998"
      },
      {
        id: "defiant",
        title: "The Defiant — EIP-7702 delegation linked Binance 14 to second wallet",
        url: "https://thedefiant.io/news/security/binance-labeled-wallet-swept-minutes-after-eip-7702-delegation"
      },
      {
        id: "drk",
        title: "drk.vc — How Binance 14 was emptied through EIP-7702 delegation",
        url: "https://drk.vc/news/binance-14-eip-7702-drain"
      },
      {
        id: "bleeping",
        title: "BleepingComputer — Binance probes potential $5.8B crypto-theft hack",
        url: "https://www.bleepingcomputer.com/news/security/binance-probes-potential-58-billion-crypto-theft-hack/"
      },
      {
        id: "bitcoincom",
        title: "Bitcoin.com — Inside the $5.8B Binance hack: confirmed vs unconfirmed",
        url: "https://news.bitcoin.com/security/inside-the-5-8b-binance-hack-whats-confirmed-and-what-isnt/"
      },
      {
        id: "binance-x",
        title: "Binance official X (@binance) — primary update channel",
        url: "https://x.com/binance"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "Binance said it was investigating reports of a \"potential security issue\" after large outflows from exchange hot wallets; founder Changpeng Zhao said it \"does look like a hack on Binance.\"",
            sourceIds: ["bbc", "ap", "techcrunch", "binance-x"]
          },
          {
            text: "On-chain analysis centers on Binance 14 (a major Ethereum hot wallet): an EIP-7702 authorization delegated the account to an attacker-controlled sweeper contract, enabling a batch sweep of ETH and tokens.",
            sourceIds: ["coindesk", "cointelegraph-blockaid", "defiant", "drk"]
          },
          {
            text: "SlowMist's Cosine (Cos) said EIP-7702 was used to facilitate batch sweeping of related hot-wallet tokens and was not itself the root cause; without EIP-7702, attackers could still have moved funds by other means.",
            sourceIds: ["slowmist-techflow"]
          },
          {
            text: "Blockaid's preliminary assessment pointed to compromise or misuse of signing infrastructure (\"key misuse\") rather than extraction of a raw private key — unconfirmed pending Binance's post-mortem.",
            sourceIds: ["cointelegraph-blockaid"]
          },
          {
            text: "Etherscan-linked reporting places a large Binance 14 ETH move at about 20:24 UTC on 29 Oct 2026 (≈04:24 HKT Fri 30 Oct), with related sweeps of other labeled Binance wallets shortly after.",
            sourceIds: ["coindesk", "drk", "bitcoincom"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "~20:20–20:24 UTC 29 Oct 2026 (≈04:20–04:24 HKT 30 Oct): EIP-7702 delegation / initial Binance 14 sweep reported on-chain (analyst timelines).",
            sourceIds: ["coindesk", "drk", "bitcoincom"]
          },
          {
            text: "Minutes after the first Ethereum sweep: additional labeled Binance hot wallets on other networks reported sending to attacker-linked addresses (multi-chain analyst tallies).",
            sourceIds: ["drk", "bleeping", "bitcoincom"]
          },
          {
            text: "Binance publicly stated it was aware of a potential security issue, that user funds were safe, and that it was investigating via official channels.",
            sourceIds: ["techcrunch", "cyberdaily", "bbc", "binance-x"]
          },
          {
            text: "Deposits and withdrawals temporarily suspended while security checks, freezes, and law-enforcement coordination continued; Binance Alpha trading also reported paused as a precaution.",
            sourceIds: ["bbc", "nbc", "cyberdaily", "aljazeera"]
          },
          {
            text: "Stablecoin issuers and partners announced freezes of linked assets; Binance published verified freeze totals that rose from about $2.54B toward ~$3B in subsequent updates.",
            sourceIds: ["bbc", "cyberdaily", "ap", "aljazeera"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "Binance (official): investigating a potential security issue; user funds safe; will cover all losses; deposits/withdrawals suspended; full post-mortem promised; rely only on official Binance channels.",
            sourceIds: ["bbc", "nbc", "cyberdaily", "binance-x", "aljazeera"]
          },
          {
            text: "Changpeng Zhao (majority shareholder, not day-to-day operator): said it looks like a hack and that he expects user funds to be fully covered.",
            sourceIds: ["bbc", "techcrunch", "aljazeera", "cyberdaily"]
          },
          {
            text: "Tether (Paolo Ardoino): froze on the order of ~$1.5B–$1.6B USDT linked to the incident (issuer freeze — confirmed by issuer statements via press).",
            sourceIds: ["bbc", "techcrunch", "coindesk"]
          },
          {
            text: "Circle (Jeremy Allaire): froze on the order of ~$800M–$823M USDC linked to the incident (issuer freeze).",
            sourceIds: ["bbc", "coindesk", "cyberdaily"]
          },
          {
            text: "Ripple and others: press reported additional freezes (e.g. ~$200M attributed to Ripple in some coverage) contributing to Binance's verified freeze totals — treat per-issuer extras as press-reported unless Binance itemizes them.",
            sourceIds: ["coindesk", "cyberdaily", "ap"]
          },
          {
            text: "Binance.US stated it is a separate platform and was not affected.",
            sourceIds: ["bbc"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "Reuters-class / wire and major outlets (BBC, AP, NBC, Al Jazeera, TechCrunch) framed the event as a suspected exchange hack with industry-wide freezes while Binance avoided confirming a final stolen total.",
            sourceIds: ["bbc", "ap", "nbc", "aljazeera", "techcrunch"]
          },
          {
            text: "Blockaid published on-chain analysis of the EIP-7702 nonce-bracket delegation against Binance 14 and assessed signing-infrastructure misuse (via Cointelegraph interview with Blockaid's CEO).",
            sourceIds: ["cointelegraph-blockaid"]
          },
          {
            text: "SlowMist commentary (via TechFlow) stressed EIP-7702 as a facilitator for batch sweeps, not a protocol root vulnerability.",
            sourceIds: ["slowmist-techflow"]
          },
          {
            text: "Independent on-chain writeups (The Defiant, drk.vc) detailed how delegated code on Binance 14 could sweep balances and reach a second Binance-operated smart account.",
            sourceIds: ["defiant", "drk"]
          },
          {
            text: "BleepingComputer and Bitcoin.com summarized public tracker tallies in the multi-billion range while noting Binance had not confirmed unauthorized theft totals.",
            sourceIds: ["bleeping", "bitcoincom"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "At Soft ACK time (30 Oct 2026 HKT): active containment / unresolved — investigation ongoing; deposits and withdrawals still described as suspended pending resolution; no full official post-mortem yet.",
            sourceIds: ["bbc", "nbc", "cyberdaily", "aljazeera", "binance-x"]
          },
          {
            text: "Binance said it would share a full post-mortem once the investigation is complete and that freeze totals may continue to rise as partners trace assets.",
            sourceIds: ["bbc", "cyberdaily", "nbc"]
          },
          {
            text: "Root cause (key theft vs signing-path compromise vs other) remains unconfirmed by Binance.",
            sourceIds: ["cointelegraph-blockaid", "techcrunch", "bitcoincom"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "Soft-read: issuer/partner freezes and Binance's verified freeze figures are far firmer than public \"stolen\" tallies. Analyst drain estimates remain unconfirmed.",
            sourceIds: ["bbc", "cyberdaily", "bitcoincom", "bleeping"]
          }
        ],
        figures: [
          {
            label: "Binance verified funds frozen (official update quoted in press)",
            amount: "~$2.54B (later updates ~$3B; may rise)",
            confidence: "confirmed",
            sourceIds: ["cyberdaily", "ap", "aljazeera", "bbc"]
          },
          {
            label: "Tether USDT frozen (issuer)",
            amount: "~$1.5B–$1.6B USDT",
            confidence: "confirmed",
            sourceIds: ["bbc", "techcrunch", "coindesk"]
          },
          {
            label: "Circle USDC frozen (issuer)",
            amount: "~$800M–$823M USDC",
            confidence: "confirmed",
            sourceIds: ["bbc", "coindesk", "cyberdaily"]
          },
          {
            label: "Binance pledge to cover losses",
            amount: "Cover all losses / user funds safe (official)",
            confidence: "confirmed",
            sourceIds: ["bbc", "nbc", "cyberdaily", "binance-x"]
          },
          {
            label: "Public analyst / tracker stolen tallies",
            amount: "~$2B–$5.8B+ (range across outlets; unconfirmed)",
            confidence: "estimate",
            sourceIds: ["techcrunch", "bbc", "bleeping", "bitcoincom", "drk"]
          },
          {
            label: "Glassnode / Chainalysis estimates cited by BBC",
            amount: "~$5.3B (Glassnode) / ~$5.9B (Chainalysis) — estimates",
            confidence: "estimate",
            sourceIds: ["bbc"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Ethereum was the primary reported leg (Binance 14 EIP-7702 sweep of ETH + large USDT and many ERC-20s); related labeled Binance wallets on Bitcoin, Tron, and L2s (Arbitrum, Optimism, Avalanche, and others in analyst tallies) also appear in multi-chain drain writeups.",
            sourceIds: ["coindesk", "drk", "bitcoincom", "bleeping"]
          },
          {
            text: "Stablecoins (USDT/USDC and other freezable assets) were the main freeze surface; ETH and other non-freezable assets remain harder to claw back per analyst notes.",
            sourceIds: ["drk", "coindesk", "bbc"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Bitcoin fell about 5% in the immediate aftermath per BBC/Al Jazeera; other major tokens also sold off sharply in early coverage.",
            sourceIds: ["bbc", "aljazeera"]
          },
          {
            text: "Industry observers had flagged unusual Binance-wallet outflows before Binance's formal acknowledgment.",
            sourceIds: ["bbc", "techcrunch"]
          },
          {
            text: "If confirmed at multi-billion scale, outlets noted it would rank among the largest crypto thefts on record (comparison to 2025 Bybit ~$1.4–$1.5B frequently cited).",
            sourceIds: ["bbc", "techcrunch", "aljazeera"]
          }
        ]
      }
    ]
  }
];

export function getIncidentById(id: string): Incident | undefined {
  return incidents.find((i) => i.id === id);
}

export function pageIncidents(
  list: Incident[],
  page: number,
  pageSize: number
): Incident[] {
  const start = Math.max(0, page) * pageSize;
  return list.slice(start, start + pageSize);
}

export function incidentSourceMap(incident: Incident): Map<string, Incident["sources"][number]> {
  return new Map(incident.sources.map((s) => [s.id, s]));
}

/** Soft FAIL guard: every claim/bullet/figure must Soft-cite ≥1 known source id. */
export function collectUnsourcedClaimPaths(incident: Incident): string[] {
  const known = new Set(incident.sources.map((s) => s.id));
  const bad: string[] = [];
  const check = (path: string, ids: string[]) => {
    if (!ids.length || ids.some((id) => !known.has(id))) bad.push(path);
  };
  incident.sections.forEach((sec, si) => {
    sec.claims.forEach((c, ci) => check(`sections[${si}].claims[${ci}]`, c.sourceIds));
    sec.bullets?.forEach((b, bi) => check(`sections[${si}].bullets[${bi}]`, b.sourceIds));
    sec.figures?.forEach((f, fi) => check(`sections[${si}].figures[${fi}]`, f.sourceIds));
  });
  return bad;
}
