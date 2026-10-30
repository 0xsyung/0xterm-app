/**
 * @file corpus.ts
 * @description Soft ACK #270 — in-repo incidents[] (no CMS/API). Binance + four past-incident backfill.
 * Soft-order by occurredAt desc. Every claim Soft-cites a verified source URL. Re-verified Eng 2026-10-30 HKT.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

import type { Incident } from "./types";

/**
 * Hardcoded incident corpus. Soft ACK #270 appends four past incidents; Binance holds.
 * Soft-nice list order: occurredAt descending. Do not invent facts.
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
  },
  {
    id: "polymarket-debugbear-rum-2026-10-29",
    title: "Polymarket — DebugBear RUM session-drainer (~$2.5–2.7M)",
    occurredAt: "2026-10-29T17:10:00.000Z",
    status: "RESOLVED",
    amountSummary: "~$2.5–2.7M drained (estimate); full reimbursement pledged",
    chains: ["Polygon"],
    sources: [
      { id: "bleeping-pm", title: "BleepingComputer — Polymarket halts after crypto-draining script; $2.5M traced", url: "https://www.bleepingcomputer.com/news/security/polymarket-halts-trading-after-crypto-draining-script-breach-25m-traced/" },
      { id: "theblock-pm", title: "The Block — Polymarket resumes after $2.65M exploit; third-party compromised", url: "https://www.theblock.co/news/defi/2026-10-29-polymarket-exploit-2-5-million-cancel-only-mode-432158" },
      { id: "cnbc-pm", title: "CNBC — Some user funds stolen; referred to UK authorities; DebugBear named", url: "https://www.cnbc.com/2026/10/29/polymarket-reports-outage-on-international-exchange-halts-trading.html" },
      { id: "decrypt-pm", title: "Decrypt — Hudson Rock: DebugBear script drains sessions; wallet 0x3F99…", url: "https://decrypt.co/382185/polymarket-pauses-trading-prediction-market-security-incident" },
      { id: "infrastack-pm", title: "InfraStack — DebugBear RUM compromise timeline / IoCs", url: "https://infrastack.ai/live/CMP-202610-polymarket-breached-through-an-unnamed-third-party-provider-" },
      { id: "pwn-pm", title: "pwn.watch — Polymarket third-party drain (Oct 29 entry)", url: "https://pwn.watch/d/2026-10-29" },
      { id: "infostealers-pm", title: "InfoStealers — Wallet-draining code in third-party script review", url: "https://www.infostealers.com/article/polymarket-breach-alert-wallet-draining-code-found-in-a-third-party-script/" },
      { id: "ap-pm", title: "AP — Polymarket pauses international trading; full reimbursement pledged", url: "https://apnews.com/article/polymarket-pause-trading-prediction-markets-cd33bc1f9bf623103e1aeef3897846b5" }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          { text: "Polymarket said one of its third-party providers was compromised; malicious JavaScript served through DebugBear Real User Monitoring (RUM) on polymarket.com hijacked authenticated trading sessions to sell positions and/or transfer assets to an attacker wallet.", sourceIds: ["bleeping-pm", "theblock-pm", "cnbc-pm", "decrypt-pm"] },
          { text: "Hudson Rock and BleepingComputer identified the payload at cdn.debugbear.com/C7xcKKrjUnXK.js, with attacker recipient 0x3F99139F1C5854bb628c2e576Aaf638e99dFfc18 hard-coded; the script used data.debugbear.com for instructions/exfil.", sourceIds: ["bleeping-pm", "decrypt-pm", "infrastack-pm", "infostealers-pm"] },
          { text: "This was a front-end / supply-chain session abuse path, not a reported Polymarket smart-contract vulnerability; Polymarket’s US platform was stated unaffected.", sourceIds: ["cnbc-pm", "pwn-pm", "theblock-pm"] },
          { text: "DebugBear confirmed an ongoing security incident and told all RUM customers to remove its embed code; how DebugBear was breached remains publicly unconfirmed.", sourceIds: ["bleeping-pm", "cnbc-pm", "infrastack-pm"] }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          { text: "~17:10 UTC 29 Oct 2026: InfraStack timeline places first attacker-address inflows around this time (third-party chronology).", sourceIds: ["infrastack-pm"] },
          { text: "~13:50–13:56 ET 29 Oct: BleepingComputer reports numerous attacker-wallet txs involving Polymarket’s prediction-market token contract shortly before suspension.", sourceIds: ["bleeping-pm"] },
          { text: "17:59 UTC / 13:59 ET: Polymarket production build metadata records removal of DebugBear RUM (commit message chore(polymarket): remove debugbear rum script #15337).", sourceIds: ["bleeping-pm", "infostealers-pm", "infrastack-pm"] },
          { text: "18:05 UTC / 14:05 ET: Polymarket puts exchange in cancel-only mode and pauses relayer actions.", sourceIds: ["theblock-pm", "pwn-pm", "bleeping-pm"] },
          { text: "18:37 UTC / 14:37 ET: Polymarket says it found and fixed the cause, that a third-party provider was compromised, and that it referred the matter to law enforcement; trading temporarily halted.", sourceIds: ["theblock-pm", "bleeping-pm", "pwn-pm"] },
          { text: "~19:00–19:05 UTC / 15:00–15:05 ET: Trading fully back online; Polymarket pledges full reimbursement; status page marked resolved (~1 hour after initial suspension).", sourceIds: ["bleeping-pm", "theblock-pm", "pwn-pm", "cnbc-pm", "ap-pm"] }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          { text: "Polymarket (official): third-party compromised; issue fixed on Polymarket.com; referred to law enforcement; anyone impacted will be made whole; trading resumed; US platform not compromised.", sourceIds: ["bleeping-pm", "theblock-pm", "cnbc-pm", "ap-pm"] },
          { text: "CNBC: person familiar said DebugBear was the compromised provider and that Polymarket referred the matter to UK law enforcement (DebugBear based in the UK).", sourceIds: ["cnbc-pm"] },
          { text: "Polymarket Discord (per CNBC): users with under $10,000 taken to be restored by Oct 30; larger amounts require signing a release form.", sourceIds: ["cnbc-pm"] },
          { text: "DebugBear: confirmed ongoing security incident on X and instructed RUM customers to remove embed code; site reported Cloudflare-inaccessible during coverage.", sourceIds: ["bleeping-pm", "cnbc-pm"] }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          { text: "Hudson Rock identified the malicious DebugBear-hosted script and the embedded attacker wallet; BleepingComputer reverse-engineered drain logic (session hijack, sell/transfer paths).", sourceIds: ["bleeping-pm", "decrypt-pm"] },
          { text: "The Block citing Arkham: suspected attacker wallet held about $2.65M in POL after USDC.e→POL swaps via Relay, then moved funds onward.", sourceIds: ["theblock-pm", "decrypt-pm"] },
          { text: "Betting Intelligence and Polysights analysis provided to CNBC: an account withdrew at least $2.7M across 710 other wallets.", sourceIds: ["cnbc-pm"] },
          { text: "pwn.watch notes CoinDesk citing DeFi Llama tracking about $2.7M and that a similar third-party vendor compromise drained about $3M in June 2026.", sourceIds: ["pwn-pm"] }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          { text: "Platform status: Polymarket marked the incident resolved after trading resumed; malicious RUM integration removed from the served build.", sourceIds: ["bleeping-pm", "pwn-pm", "infostealers-pm"] },
          { text: "Reimbursement: full make-whole pledged; Discord process described by CNBC — completion rate not independently verified here.", sourceIds: ["cnbc-pm", "bleeping-pm", "theblock-pm", "ap-pm"] },
          { text: "Unresolved: DebugBear root-cause / whether other DebugBear customers served malicious code; Polymarket has not published an official aggregate stolen total.", sourceIds: ["infrastack-pm", "bleeping-pm", "infostealers-pm"] }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          { text: "Soft-read: on-chain/analytics tallies cluster ~$2.5–2.7M; Polymarket has not confirmed a single official loss figure. Reimbursement is a confirmed pledge, not a confirmed completed payout total.", sourceIds: ["bleeping-pm", "theblock-pm", "cnbc-pm"] }
        ],
        figures: [
          { label: "Attacker wallet POL moved (BleepingComputer)", amount: "~28.6M POL ≈ $2.57M", confidence: "estimate", sourceIds: ["bleeping-pm"] },
          { label: "Arkham / The Block wallet holding", amount: "~$2.65M POL", confidence: "estimate", sourceIds: ["theblock-pm", "decrypt-pm"] },
          { label: "Betting Intelligence / Polysights (via CNBC)", amount: "≥$2.7M across ~710 wallets", confidence: "estimate", sourceIds: ["cnbc-pm"] },
          { label: "Polymarket reimbursement pledge", amount: "Full make-whole for affected traders", confidence: "confirmed", sourceIds: ["bleeping-pm", "theblock-pm", "cnbc-pm", "ap-pm"] },
          { label: "Polymarket official stolen total", amount: "Not disclosed", confidence: "estimate", sourceIds: ["bleeping-pm", "cnbc-pm"] }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          { text: "Polymarket.com international exchange operates as DeFi on Polygon; drained value observed largely as POL and prediction-market positions, with USDC.e→POL swaps via Relay noted by Arkham/The Block.", sourceIds: ["cnbc-pm", "theblock-pm", "decrypt-pm"] },
          { text: "Attacker address cited across sources: 0x3F99139F1C5854bb628c2e576Aaf638e99dFfc18 (Polygon).", sourceIds: ["bleeping-pm", "decrypt-pm", "infrastack-pm"] }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          { text: "Traders flagged unauthorized withdrawals on social media before Polymarket’s cancel-only announcement; individual large-loss anecdotes circulated but are user claims, not Polymarket-confirmed.", sourceIds: ["cnbc-pm", "pwn-pm"] },
          { text: "CNBC noted timing days before US midterms (Nov 3) when volumes were expected to rise; Betting Intelligence called it a significant new breach form for Polymarket.", sourceIds: ["cnbc-pm"] },
          { text: "Coverage linked this to an earlier 2026 third-party vendor compromise on Polymarket (~$3M in June per pwn.watch/CNBC context).", sourceIds: ["pwn-pm", "cnbc-pm", "theblock-pm"] }
        ]
      }
    ]
  },
  {
    id: "hifi-finance-governance-2026-10-28",
    title: "Hifi Finance — DAO governance Proposal 21 (~$1M collateral)",
    occurredAt: "2026-10-28T22:25:36.000Z",
    status: "UNRESOLVED",
    amountSummary: "~$1M user collateral (estimate); 25M HIFI minted; no official post-mortem yet",
    chains: ["Ethereum"],
    sources: [
      { id: "slowmist-hifi", title: "SlowMist Hacked — Hifi Finance $1M governance attack", url: "https://hacked.slowmist.io/" },
      { id: "tcg-hifi", title: "The Crypto Guardian — Hifi Finance incident record", url: "https://thecryptoguardian.com/crypto-incidents/hifi-finance-2026-10-28/" },
      { id: "telem-hifi", title: "telem.news — Tornado-funded votes; BalanceSheet idle-collateral harvest", url: "https://telem.news/security/hifi-finance-governance-attacked-tornado-cash-funded-address-attacker-61ba87f7" },
      { id: "dave-hifi", title: "Dave Finances — Spreek disclosure; ~$1M; unknowns on timelock", url: "https://davefinances.com/humanode-patches-evm-flaw-as-hifi-faces-1m-loss/" },
      { id: "musesec-hifi", title: "MuseSec — three DAO takeovers week; Hifi no public comment", url: "https://musesec.com/en/research/dao-governance-takeovers-oct-2026/" },
      { id: "tokenpost-hifi", title: "TokenPost — Spreek: ~$1M collateral after governance takeover", url: "https://www.tokenpost.com/news/technology/43138" }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          { text: "Hifi Finance suffered a DAO governance takeover: addresses funded via Tornado Cash cast four last-minute votes that passed malicious Proposal 21, after which the attacker upgraded the BalanceSheet contract, minted 25 million HIFI, and drained approximately $1 million in user collateral (mostly RWA).", sourceIds: ["slowmist-hifi", "tcg-hifi", "telem-hifi", "dave-hifi"] },
          { text: "telem.news: Proposal 21 passed 2,945,598 for / 0 against (quorum 2,839,677); the upgraded BalanceSheet initialized asset trackers at zero so pre-upgrade collateral was classified as idle and harvested to an attacker-hardcoded address.", sourceIds: ["telem-hifi"] },
          { text: "Nearly all drained value reported as HC1 RWA securing the protocol’s single active loan (~$1.02M in telem.news); the loan was left unsecured on-chain after collateral removal.", sourceIds: ["telem-hifi", "tcg-hifi"] },
          { text: "Same attack group reportedly attempted similar Proposals 18 and 20 earlier (both defeated). This was governance privilege abuse, not a conventional reentrancy/oracle bug.", sourceIds: ["telem-hifi", "musesec-hifi"] }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          { text: "Earlier: Proposals 18 and 20 — similar malicious attempts defeated (telem.news).", sourceIds: ["telem-hifi"] },
          { text: "28 Oct 2026: four Tornado Cash–funded last-minute votes pass Proposal 21.", sourceIds: ["slowmist-hifi", "tcg-hifi", "telem-hifi"] },
          { text: "22:25:36 UTC 28 Oct: researcher Spreek discloses the takeover (Dave Finances / TokenPost).", sourceIds: ["dave-hifi", "tokenpost-hifi"] },
          { text: "After passage: BalanceSheet upgrade → mint 25M HIFI → transfer ~$1M user collateral (mostly HC1).", sourceIds: ["telem-hifi", "tcg-hifi", "slowmist-hifi"] },
          { text: "Defenders cited a narrow ~three-hour window to craft a counterproposal before execution (telem.news).", sourceIds: ["telem-hifi"] },
          { text: "As of 29 Oct MuseSec review: Hifi had not commented publicly; readers told to verify on-chain whether the proposal fully executed.", sourceIds: ["musesec-hifi", "dave-hifi"] }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          { text: "Hifi Finance: no public official statement / post-mortem located in MuseSec and Dave Finances reporting as of their publish times.", sourceIds: ["musesec-hifi", "dave-hifi"] },
          { text: "SlowMist: catalogued as 28 Oct governance attack with $1,000,000 loss.", sourceIds: ["slowmist-hifi"] },
          { text: "Researcher Spreek: primary public disclosure thread referenced by TokenPost and Dave Finances.", sourceIds: ["tokenpost-hifi", "dave-hifi", "musesec-hifi"] }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          { text: "The Crypto Guardian incident record summarizes last-minute votes → BalanceSheet upgrade → ~$1M RWA collateral drain.", sourceIds: ["tcg-hifi"] },
          { text: "telem.news adds vote tallies, idle-collateral harvest mechanism, HC1 concentration, and prior defeated proposals 18/20.", sourceIds: ["telem-hifi"] },
          { text: "MuseSec groups Hifi with X100 (~$4.85M) and Yapeswap (~$22K) as same-week governance takeovers that used the projects’ own voting rules.", sourceIds: ["musesec-hifi"] },
          { text: "Dave Finances flags unresolved questions: how Proposal 21 related to documented five-day voting / two-day timelock safeguards.", sourceIds: ["dave-hifi"] }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          { text: "Unresolved: no verified official Hifi post-mortem or make-whole pledge in sources reviewed; collateral movement reported complete.", sourceIds: ["musesec-hifi", "dave-hifi", "slowmist-hifi"] },
          { text: "Forward risk noted by telem.news: minted HIFI voting power could enable further oracle/mint proposals — described as risk, not a confirmed follow-on exploit.", sourceIds: ["telem-hifi"] },
          { text: "Unknown: precise on-chain execution vs timelock/veto path; independently verified final loss accounting still pending per Dave Finances.", sourceIds: ["dave-hifi"] }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          { text: "Soft-read: ~$1M is the repeated collateral-loss estimate (SlowMist / Crypto Guardian / Spreek accounts). 25M is a token mint count, not a $25M USD loss.", sourceIds: ["slowmist-hifi", "dave-hifi", "tokenpost-hifi"] }
        ],
        figures: [
          { label: "User collateral drained (SlowMist / Crypto Guardian)", amount: "~$1,000,000", confidence: "estimate", sourceIds: ["slowmist-hifi", "tcg-hifi"] },
          { label: "HC1 RWA portion (telem.news)", amount: "~$1.02M (nearly all)", confidence: "estimate", sourceIds: ["telem-hifi"] },
          { label: "HIFI minted", amount: "25,000,000 HIFI (token count)", confidence: "confirmed", sourceIds: ["telem-hifi", "tcg-hifi", "dave-hifi"] },
          { label: "Issuer/project coverage or freezes", amount: "Not reported", confidence: "estimate", sourceIds: ["dave-hifi", "musesec-hifi"] }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          { text: "Hifi Finance DeFi on Ethereum; drained assets described as user collateral dominated by HC1 (RWA) plus newly minted HIFI governance tokens.", sourceIds: ["telem-hifi", "tcg-hifi", "slowmist-hifi"] }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          { text: "Security commentary framed October 2026 as a cluster of DAO governance takeovers (X100, Yapeswap, Hifi) exploiting low turnout and overly powerful upgrade/mint/treasury privileges.", sourceIds: ["musesec-hifi"] },
          { text: "MuseSec recommendations cited across the industry piece: snapshot voting, holding periods, timelock + veto, and stripping governance power over user funds when winding down products.", sourceIds: ["musesec-hifi"] }
        ]
      }
    ]
  },
  {
    id: "zklink-nova-bridge-2026-10-28",
    title: "zkLink Nova bridge — forged batch root (~$783–786K)",
    occurredAt: "2026-10-28T22:21:35.000Z",
    status: "CONTAINED",
    amountSummary: "~$783K–$786K Ethereum drain (estimate); contained, withdrawals disabled",
    chains: ["Ethereum", "Optimism", "Base", "Blast", "Mantle"],
    sources: [
      { id: "slowmist-zk", title: "SlowMist Hacked — zkLink Nova $783,100 forged batch-root", url: "https://hacked.slowmist.io/" },
      { id: "slowmist-x-zk", title: "SlowMist Team X — technical alert", url: "https://x.com/SlowMist_Team/status/2115635114638250409" },
      { id: "cryptotimes-zk", title: "Crypto Times — zkLink Nova ~$786K forged batch root", url: "https://www.cryptotimes.io/2026/10/29/zklink-nova-bridge-exploited-for-786k-as-forged-batch-root-drains-ethereum-escrow/" },
      { id: "pwn-zk", title: "pwn.watch — zkLink Nova forged batch-root incident page", url: "https://pwn.watch/i/zklink-nova-bridge-forged-batch-root-exploit-oct-2026" },
      { id: "panda-zk", title: "PandaSecurity / DEV — stale transient hash forged a root", url: "https://dev.to/pandasecurity/zklink-nova-exploit-a-stale-transient-hash-forged-a-root-oji" },
      { id: "parapet-zk", title: "Parapet Labs — zkLink Nova exploit post-mortem", url: "https://parapetlabs.net/blog/zklink-nova-exploit-post-mortem/" }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          { text: "An attacker drained zkLink Nova’s Ethereum L1 escrow and ERC-20 bridge by installing an attacker-chosen batch Merkle root, then finalizing withdrawals with self-crafted proofs — no key theft required.", sourceIds: ["cryptotimes-zk", "panda-zk", "parapet-zk", "pwn-zk"] },
          { text: "SlowMist: root cause in Arbitrator.claimMessage — failure to clear transient finalizeMessageHash and lack of a fresh authenticated callback — combined with publicly callable SyncL2TxHashRelayer treated as authorized, allowing ZkLink.syncBatchRoot to run under the legitimate gateway identity.", sourceIds: ["slowmist-zk", "slowmist-x-zk", "pwn-zk", "panda-zk"] },
          { text: "Attack sequence in one transaction (block 26294188, 22:21:35 UTC 28 Oct): arm latch with a genuine Linea message → smuggle EthereumGateway.sendMessage wrapping syncBatchRoot for batch 116409 → finalize ETH + 11 ERC-20 withdrawals to the attacker.", sourceIds: ["cryptotimes-zk", "panda-zk", "parapet-zk"] },
          { text: "Primary haul dominated by liquid restaking tokens, especially ~245.74 pufETH, plus 22.43 ETH and other ERC-20s.", sourceIds: ["cryptotimes-zk", "panda-zk", "pwn-zk"] }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          { text: "22:21:35 UTC 28 Oct 2026: single Ethereum exploit transaction records new batch root and drains escrow/bridge.", sourceIds: ["cryptotimes-zk", "panda-zk", "pwn-zk"] },
          { text: "Hours later / ~02:24 UTC 29 Oct: Blockaid flags ongoing exploit; reports public relayer used to inject forged batch root; main escrow still unpaused at flag time.", sourceIds: ["pwn-zk", "cryptotimes-zk", "parapet-zk"] },
          { text: "29 Oct: SlowMist publishes ~$783.1K loss and Arbitrator.claimMessage root-cause writeup; ExVul/Arisk publish parallel traces.", sourceIds: ["pwn-zk", "slowmist-zk"] },
          { text: "~07:16 UTC 29 Oct: Parapet attributes a second-wave drain on Optimism/Base/Blast/Mantle (~24.76 ETH + tokens) to a different actor (researcher figure).", sourceIds: ["parapet-zk", "panda-zk"] },
          { text: "09:06 UTC 29 Oct: zkLink confirms ongoing exploit of Nova Arbitrator on Ethereum and Optimism; offers 20% white-hat bounty for returned funds.", sourceIds: ["pwn-zk", "panda-zk"] },
          { text: "13:08 UTC 29 Oct: zkLink suspends Nova block production, emergency-patches affected contracts, temporarily disables withdrawals.", sourceIds: ["pwn-zk", "panda-zk"] }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          { text: "zkLink: confirmed Arbitrator exploit on Ethereum and Optimism; asked attacker to stop and return funds with 20% white-hat bounty; later said block production suspended, contracts emergency-patched, withdrawals temporarily disabled.", sourceIds: ["pwn-zk", "panda-zk"] },
          { text: "Blockaid: first public detection of ongoing bridge drain via forged batch root.", sourceIds: ["pwn-zk", "cryptotimes-zk"] },
          { text: "SlowMist: listed incident at $783,100 with SyncL2TxHashRelayer + uncleared finalizeMessageHash description.", sourceIds: ["slowmist-zk", "slowmist-x-zk"] }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          { text: "Crypto Times compiled Etherscan asset table (~$780K at Oct 29 prices) and post-drain swaps (MetaMask Swaps, Curve) plus splits to three addresses (~303 ETH).", sourceIds: ["cryptotimes-zk"] },
          { text: "PandaSecurity and Parapet Labs published deep root-cause posts (transient latch + privileged arbitrary call); Parapet fork-replayed that either fix alone stops the forged claim.", sourceIds: ["panda-zk", "parapet-zk"] },
          { text: "pwn.watch aggregates Blockaid, SlowMist, ExVul, Arisk, and zkLink statements into a single timeline.", sourceIds: ["pwn-zk"] }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          { text: "Contained: Nova block production suspended; affected contracts emergency-patched; withdrawals temporarily disabled (zkLink 13:08 UTC 29 Oct).", sourceIds: ["pwn-zk", "panda-zk"] },
          { text: "Not fully resolved: primary stolen funds not reported recovered; reopen / risk-clearance pending; second-wave chain impact remains a researcher-reported concern.", sourceIds: ["parapet-zk", "cryptotimes-zk", "pwn-zk"] },
          { text: "White-hat path: 20% bounty offered if funds returned (zkLink statement via pwn.watch/Panda).", sourceIds: ["pwn-zk", "panda-zk"] }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          { text: "Soft-read: firm tallies cluster ~$780K–$786K for the Ethereum drain; USD varies by price oracle/time. Token amounts (22.43 ETH, 245.74 pufETH, etc.) are on-chain confirmed.", sourceIds: ["slowmist-zk", "cryptotimes-zk", "panda-zk"] }
        ],
        figures: [
          { label: "SlowMist loss tally", amount: "$783,100", confidence: "estimate", sourceIds: ["slowmist-zk", "pwn-zk"] },
          { label: "Blockaid / Crypto Times headline", amount: "~$786,000", confidence: "estimate", sourceIds: ["cryptotimes-zk", "pwn-zk"] },
          { label: "ETH drained (on-chain amount)", amount: "22.43 ETH", confidence: "confirmed", sourceIds: ["cryptotimes-zk", "panda-zk", "pwn-zk"] },
          { label: "pufETH drained (on-chain amount)", amount: "245.74 pufETH (USD ~$579K–$615K estimate)", confidence: "confirmed", sourceIds: ["cryptotimes-zk", "panda-zk", "pwn-zk"] },
          { label: "Second-wave (Parapet, other chains)", amount: "≈24.76 ETH + token inventories", confidence: "estimate", sourceIds: ["parapet-zk", "panda-zk"] },
          { label: "White-hat bounty offer", amount: "20% if funds returned", confidence: "confirmed", sourceIds: ["pwn-zk", "panda-zk"] }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          { text: "Primary drain: Ethereum mainnet zkLink Nova escrow (0x5fd9f732…e015cf) and L1ERC20Bridge (0xad16edcf…544b6b6).", sourceIds: ["panda-zk", "cryptotimes-zk", "parapet-zk"] },
          { text: "zkLink confirmed Arbitrator targeting on Ethereum and Optimism; researchers also reported follow-on activity on Base, Blast, and Mantle.", sourceIds: ["pwn-zk", "parapet-zk", "panda-zk"] },
          { text: "Assets included ETH, pufETH, ezETH, USDC, rsETH, STONE, WBTC, mstETH, mswETH, USDT, wstETH, rswETH; attacker EOA commonly cited 0xaca0655a11200a80d33d0e48786317304cde5718.", sourceIds: ["cryptotimes-zk", "panda-zk", "parapet-zk"] }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          { text: "Security firms framed this as another 2026 cross-chain message-verification failure (compare forged-message themes in other bridge incidents).", sourceIds: ["cryptotimes-zk", "panda-zk"] },
          { text: "Users holding Nova assets were advised to avoid bridge interaction until the team confirmed contracts secure; withdrawals remained disabled during containment.", sourceIds: ["cryptotimes-zk", "pwn-zk"] },
          { text: "Parapet noted historical pause designs that blocked deposits but not withdrawal finalization — a residual risk pattern called out for responders.", sourceIds: ["parapet-zk"] }
        ]
      }
    ]
  },
  {
    id: "tranchepool-avalanche-2026-10-28",
    title: "TranchePool (Avalanche) — UTC rollover settlement (~$1.013M USDC)",
    occurredAt: "2026-10-28T00:00:03.000Z",
    status: "UNRESOLVED",
    amountSummary: "1,013,353.61 USDC drained (confirmed amount); 10% bounty offered, return unconfirmed",
    chains: ["Avalanche", "Solana"],
    sources: [
      { id: "panda-tp", title: "PandaSecurity — TranchePool midnight rollover drained $1.01M", url: "https://panda-security.vercel.app/blog/tranchepool-utc-rollover-settlement-exploit/" },
      { id: "slowmist-tp", title: "SlowMist Hacked — TranchePool $1,013,000 settlement flaw", url: "https://hacked.slowmist.io/" },
      { id: "sentinelle-tp", title: "Sentinelleai — fork replay: one second of block time", url: "https://dev.to/sentinelleai/one-second-of-block-time-replaying-the-fence-finance-tranchepool-drain-hni" },
      { id: "blockfence-tp", title: "Blockfence — Avalanche tranche vault exploited for $1.01M USDC", url: "https://blockfence.io/avalanche-tranche-vault-exploited-for-1-01-million-in-usdc/" },
      { id: "sch-tp", title: "Smart Contract Hacking — TranchePool Hack 2026 summary", url: "https://smartcontractshacking.com/hacks/tranchepool-hack-2026" }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          { text: "A TranchePool on Avalanche C-Chain (SlowMist: associated with Valinor Digital, Oatfi, and Fence Finance) lost its entire USDC balance when UTC-day rollover settlement treated a scheduled principal repayment as received without any USDC arriving, restoring draw capacity equal to fundedPrincipal − outstandingPrincipal.", sourceIds: ["panda-tp", "slowmist-tp", "sentinelle-tp", "blockfence-tp"] },
          { text: "Attack used two txs from EOA 0x6ff1c3ff…2b1246 via helper 0xf09dcf4e…a57805: (1) 23:56:41 UTC 27 Oct Aave v3 flash loan of exactly the pool balance to set up and schedule a midnight repayment, leaving the pool full; (2) 00:00:03 UTC 28 Oct identical draw calldata empties 1,013,353.611686 USDC.", sourceIds: ["panda-tp", "sentinelle-tp", "sch-tp"] },
          { text: "Sentinelleai fork replay: same calldata reverts at 23:59:59 and succeeds at 00:00:00 — only block time changes the outcome. Flash loan made setup capital-free; the theft is the rollover accounting bug.", sourceIds: ["sentinelle-tp", "panda-tp"] },
          { text: "Pool source code is unverified on public explorers; analyses rest on calldata, events, balances, and fork replays. Early Blockaid share-inflation reading was superseded by SlowMist/CertiK settlement analysis.", sourceIds: ["panda-tp", "sentinelle-tp", "blockfence-tp"] }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          { text: "~15 minutes before setup: attacker deploys helper contract 0xf09dcf4e…a57805 (PandaSecurity).", sourceIds: ["panda-tp"] },
          { text: "23:56:41 UTC 27 Oct 2026: flash-loan setup tx (pool still holds full USDC afterward).", sourceIds: ["panda-tp", "sentinelle-tp"] },
          { text: "00:00:00 UTC 28 Oct: rollover books scheduled principal as paid; outstanding principal drops ~1.013M on paper.", sourceIds: ["panda-tp", "slowmist-tp", "sentinelle-tp"] },
          { text: "00:00:03 UTC 28 Oct: drain tx empties pool to zero (1,013,353.611686 USDC).", sourceIds: ["panda-tp", "sentinelle-tp", "sch-tp"] },
          { text: "00:03:41 and 00:05:22 UTC: Circle CCTP depositForBurnWithHook burns ~250,000 and ~763,375 USDC to Solana (domain 5).", sourceIds: ["panda-tp", "sch-tp"] },
          { text: "03:16:23 UTC 28 Oct: on-chain message on behalf of Fence offers 10% bounty for return of 90% of verified funds (recovery@fence.finance).", sourceIds: ["panda-tp", "sentinelle-tp"] }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          { text: "Fence Finance: on-chain recovery message offering 10% bounty for return of 90% of verified affected funds; contact recovery@fence.finance.", sourceIds: ["panda-tp", "sentinelle-tp"] },
          { text: "SlowMist: incident entry describing UTC-rollover settlement flaw restoring ~$1.013M draw capacity.", sourceIds: ["slowmist-tp"] },
          { text: "Blockaid flagged early (initially as flash-loan share inflation); CertiK Alert independently summarized reopened draw capacity (per PandaSecurity).", sourceIds: ["panda-tp", "blockfence-tp"] }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          { text: "PandaSecurity published the primary long-form root-cause post with addresses, txs, simplified buggy model, and auditor lessons.", sourceIds: ["panda-tp"] },
          { text: "Sentinelleai published an independent Avalanche fork replay proving time-dependence of the second draw.", sourceIds: ["sentinelle-tp"] },
          { text: "Blockfence and Smart Contract Hacking summarized the double-draw / settlement bug for a broader audience.", sourceIds: ["blockfence-tp", "sch-tp"] }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          { text: "Unresolved: entire pool USDC drained; PandaSecurity/Sentinelleai had not seen a confirmed return of funds or full depositor-loss statement at publish time.", sourceIds: ["panda-tp", "sentinelle-tp"] },
          { text: "Recovery path offered (10%/90% bounty) but acceptance unconfirmed in reviewed sources.", sourceIds: ["panda-tp", "sentinelle-tp", "sch-tp"] },
          { text: "Unknown: patched redeploy status; exact product branding beyond SlowMist’s Valinor/Oatfi/Fence association.", sourceIds: ["slowmist-tp", "panda-tp"] }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          { text: "Soft-read: drained token amount is on-chain exact (1,013,353.61 USDC). USD label ≈ same. Bounty is an offer only.", sourceIds: ["panda-tp", "slowmist-tp"] }
        ],
        figures: [
          { label: "USDC drained (on-chain)", amount: "1,013,353.61 USDC (entire pool)", confidence: "confirmed", sourceIds: ["panda-tp", "sentinelle-tp", "sch-tp"] },
          { label: "SlowMist listed loss", amount: "$1,013,000", confidence: "estimate", sourceIds: ["slowmist-tp"] },
          { label: "Aave v3 flash-loan premium", amount: "~506.68 USDC", confidence: "confirmed", sourceIds: ["panda-tp"] },
          { label: "CCTP burned to Solana", amount: "~250,000 + ~763,375 USDC", confidence: "confirmed", sourceIds: ["panda-tp", "sch-tp"] },
          { label: "Fence recovery bounty offer", amount: "10% if 90% returned", confidence: "confirmed", sourceIds: ["panda-tp", "sentinelle-tp"] },
          { label: "Funds returned", amount: "Not confirmed", confidence: "estimate", sourceIds: ["panda-tp", "sentinelle-tp"] }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          { text: "Drain on Avalanche C-Chain TranchePool 0xe25cb545bdd47a8ec2d08001cb5661b00d47621a; asset USDC only for the theft.", sourceIds: ["panda-tp", "sentinelle-tp", "slowmist-tp"] },
          { text: "Within minutes, funds left Avalanche via Circle CCTP to Solana (destination domain 5).", sourceIds: ["panda-tp", "sch-tp"] },
          { text: "Setup tx 0x19ab145e…9769899fd; drain tx 0x3f6b2329…1de058c77; attacker 0x6ff1c3ffa622e1062168f3497a275be9cc2b1246.", sourceIds: ["panda-tp", "sentinelle-tp"] }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          { text: "Analysts highlighted a broader lesson for on-chain credit: never reduce outstanding principal on a calendar schedule without measuring token balance deltas; fuzz across UTC day boundaries and borrower-chosen due dates.", sourceIds: ["panda-tp", "sentinelle-tp"] },
          { text: "Unverified contract source slowed independent response; monitoring that watches mints/prices may miss a “routine” scheduled state update.", sourceIds: ["panda-tp"] }
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
