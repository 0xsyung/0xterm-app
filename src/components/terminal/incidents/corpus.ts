/**
 * @file corpus.ts
 * @description Soft ACK #303 Mercado Bitcoin multi-chain hot-wallet drain corpus append + Soft ACK #301 ZachXBT EU CEX + Soft ACK #296 b14g / Soft ACK #291 BTCPay + Soft ACK #281/#282/#284/#285/#289 hold. Soft ACK #279/#277/#275/#272 hold.
 * Order by occurredAt desc. Every claim cites a verified source URL. Soft-/ops jargon scrubbed Eng 2026-11-03 HKT.
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

import type { Incident } from "./types";

/**
 * Hardcoded incident corpus. Soft ACK #303 appends Soft ID mercado-bitcoin-drain-2026-11-02 (ACTIVE; Background-first CEX; exchange custody/signing Soft-frame; distinct from Soft ACK #301 Soft ID zachxbt-eu-cex-theft-2026-11-01); Soft ACK #301 ZachXBT EU CEX hold; Soft ACK #296 b14g / Soft ACK #291 BTCPay + Soft ACK #281/#282/#284/#285/#289 hold; Soft ACK #279 Talis + Soft ACK #277 VergeX + Soft ACK #275 Flap/Kintsu + Soft ACK #272 Binance + Soft ACK #270 four backfill IDs hold.
 * List order: occurredAt descending. Do not invent facts or unsourced size metrics. App report bodies stay professional (no Soft-/ops jargon).
 */
export const incidents: Incident[] = [
  {
    id: "b14g-core-hardfork-recovery-2026-11-02",
    title: "b14g / Core — staking drain + hard-fork recovery (~70% clawed)",
    occurredAt: "2026-11-02T07:23:40.000Z",
    status: "CONTAINED",
    amountSummary:
      "97,045,563 CORE drained; 68,146,177.22 CORE (~70.2%) recovered to designated wallet; ~28.9M residual; not distributed",
    chains: ["Core (CORE staking orders)", "Bitcoin (BTC time-locks claimed unaffected)"],
    background: {
      protocolType: "restaking",
      sizeMetrics: [
        {
          label: "DefiLlama total TVL (approx.)",
          value: "~$250.1M (Bitcoin ~$247.1M; Core ~$2.81M; Babylon Genesis ~$0.21M)",
          asOf: "2026-11-02 ~08:00 UTC",
          confidence: "estimate",
          sourceIds: ["pwn-b14g", "bitquery-b14g"]
        },
        {
          label: "CORE drained (Oct 31)",
          value: "97,045,563 CORE (~$1.47M at ~$0.0151 pre-attack)",
          asOf: "2026-10-31 09:29:51 UTC",
          confidence: "confirmed",
          sourceIds: ["bitquery-b14g", "pwn-b14g", "b14g-recovery-x"]
        },
        {
          label: "CORE recovered (hard fork)",
          value: "68,146,177.22 CORE (~70.2%)",
          asOf: "2026-11-02 Recovery Update #1",
          confidence: "confirmed",
          sourceIds: ["b14g-recovery-x", "corescan-recovery", "tokenpost-b14g"]
        }
      ],
      notes: [
        {
          text: "b14g is a Bitcoin dual-staking / restaking layer: users pair time-locked BTC with CORE deposited into per-order staking contracts on Core. This report covers the Oct 31 CORE order drain and the Nov 2 Core hard-fork recovery of idle attacker balances.",
          sourceIds: ["pwn-b14g", "bitquery-b14g", "b14g-recovery-x"]
        }
      ]
    },
    sources: [
      {
        id: "b14g-recovery-x",
        title: "b14g (@b14g_network) — Recovery Update #1: Core hard fork moves ~68.15M CORE to recovery wallet",
        url: "https://x.com/b14g_network/status/2117155664980251068"
      },
      {
        id: "corescan-recovery",
        title: "CoreScan — designated recovery wallet 0xb85095…ac064",
        url: "https://scan.coredao.org/address/0xb85095fE01C1d95da3B1df0998ff5eDDcC9ac064"
      },
      {
        id: "bitquery-b14g",
        title: "Bitquery — b14g hack investigation (zero-amount withdrawals; fund flow)",
        url: "https://bitquery.io/investigations/b14g-hack"
      },
      {
        id: "tokenpost-b14g",
        title: "TokenPost — Core hard-fork recovery restatement (~70% CORE clawed)",
        url: "https://www.tokenpost.com/news/technology/46223"
      },
      {
        id: "pwn-b14g",
        title: "pwn.watch — b14g Core staking zero-withdrawal drain (Oct 2026)",
        url: "https://pwn.watch/i/b14g-core-staking-zero-withdrawal-drain-oct-2026"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "On 31 Oct 2026 at 09:29:51 UTC, a fresh attacker wallet submitted 99 withdrawal requests for 0 CORE against 91 b14g staking orders it had never funded. Core staking code treats a 0 amount as “withdraw the entire stake”; b14g’s contract neither rejected the zero nor checked order ownership, so 97,045,563 CORE paid out in one transaction (~$1.47M at ~$0.0151).",
            sourceIds: ["bitquery-b14g", "pwn-b14g"]
          },
          {
            text: "Reading: on-chain smart-contract / staking-order custody incident on Core — not a Bitcoin L1 compromise of the BTC time-locks (team claim; Bitquery did not independently verify the Bitcoin side) and not a stolen admin key. Bitquery notes the standing proxy implementation had been unchanged ~17 months.",
            sourceIds: ["bitquery-b14g", "pwn-b14g"]
          },
          {
            text: "Recovery Update #1 (2 Nov 2026): b14g stated a Core network hard fork performed a one-time state adjustment that moved 68,146,177.22 CORE from three attacker-controlled addresses into designated recovery wallet 0xb85095fE01C1d95da3B1df0998ff5eDDcC9ac064. Official claims: no transaction rollbacks, no new mint, CORE total supply unchanged. Recovered funds have not been distributed to users; the team warned against fake recovery sites.",
            sourceIds: ["b14g-recovery-x", "corescan-recovery", "tokenpost-b14g"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "31 Oct 2026 ~09:00 UTC: attacker wallet A funded with ~615.62 CORE (fee) via a labeled service path (Bitquery).",
            sourceIds: ["bitquery-b14g"]
          },
          {
            text: "31 Oct 2026 09:29:51 UTC (~17:29 HKT): zero-amount drain — 97,045,563 CORE from 91 orders.",
            sourceIds: ["bitquery-b14g", "pwn-b14g"]
          },
          {
            text: "31 Oct 2026 09:37–10:10 UTC: ~23.4M CORE leaves wallet A toward new addresses / services / exchange deposits.",
            sourceIds: ["bitquery-b14g"]
          },
          {
            text: "31 Oct 2026 10:35:51 UTC (~18:35 HKT): b14g contracts paused (~66 minutes after the drain).",
            sourceIds: ["bitquery-b14g", "pwn-b14g"]
          },
          {
            text: "31 Oct evening: Bitquery recorded ~68.15M CORE still idle across wallet B and two satellite wallets; ~28.9M had reached services/exchanges. b14g claimed ~9M CORE frozen by exchange partners (off-chain; not independently verifiable on CoreScan).",
            sourceIds: ["bitquery-b14g", "pwn-b14g"]
          },
          {
            text: "1 Nov 2026 ~00:38 HKT: b14g Security Update (~97M drained; ~68M still on Core; ~9M frozen claim; BTC time-locks claimed unaffected; named attacker wallets A/B).",
            sourceIds: ["pwn-b14g"]
          },
          {
            text: "1 Nov 2026 ~01:24 HKT: Core DAO stated the network was secure and that it was helping freeze/trace; consensus / other staking paths claimed unaffected.",
            sourceIds: ["pwn-b14g"]
          },
          {
            text: "2 Nov 2026 ~07:23 UTC (~15:23 HKT): b14g Recovery Update #1 — Core hard fork; 68,146,177.22 CORE to recovery wallet; no user distribution yet; fake-site warning.",
            sourceIds: ["b14g-recovery-x", "tokenpost-b14g", "corescan-recovery"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "b14g (@b14g_network): primary official ACK across Oct 31 Security Update and Nov 2 Recovery Update #1; contracts paused; coordinating with exchanges and law enforcement on residual assets; transparent distribution plan stated as forthcoming (no timeline or amounts published).",
            sourceIds: ["b14g-recovery-x", "pwn-b14g", "tokenpost-b14g"]
          },
          {
            text: "Core DAO (31 Oct): stated consensus, validators, and staking contracts operated normally and that CORE staked directly with validators or via other protocols was unaffected; helping freeze/trace.",
            sourceIds: ["pwn-b14g"]
          },
          {
            text: "Bitquery: published on-chain exploit and fund-flow analysis (zero-amount withdrawal pattern; ~70% idle stack; exchange/service paths for residual).",
            sourceIds: ["bitquery-b14g"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "TokenPost restates the Nov 2 hard-fork recovery (~70% CORE clawed into a recovery wallet) as secondary press of the official Recovery Update.",
            sourceIds: ["tokenpost-b14g", "b14g-recovery-x"]
          },
          {
            text: "pwn.watch aggregates Oct 31 official text transcripts (b14g + Core DAO) for the zero-withdrawal drain narrative.",
            sourceIds: ["pwn-b14g"]
          },
          {
            text: "Bitquery investigation is the primary technical write-up of the zero-amount withdrawal path and post-drain fund movement.",
            sourceIds: ["bitquery-b14g"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "Status CONTAINED / recovery in progress — not RESOLVED: ~70.2% of drained CORE sits in the designated recovery wallet after a claimed one-time Core hard-fork state adjustment; contracts remain paused; residual ~28.9M CORE is outstanding via exchange freezes / law enforcement paths; recovered funds have not been distributed.",
            sourceIds: ["b14g-recovery-x", "corescan-recovery", "bitquery-b14g", "tokenpost-b14g"]
          },
          {
            text: "Do not flip to RESOLVED until an official hard-fork technical note, a dated distribution plan with custody details, and residual accounting (including any verified exchange freezes) land. Users should avoid fake recovery sites.",
            sourceIds: ["b14g-recovery-x", "tokenpost-b14g"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "Drain was almost entirely CORE inside b14g orders on Core. Pre-attack CORE ≈ $0.0151 implies ≈ $1.47M USD for 97,045,563 CORE — not “$97M” (a common early misread of the coin count as dollars).",
            sourceIds: ["bitquery-b14g", "pwn-b14g"]
          },
          {
            text: "Recovered 68,146,177.22 CORE (~70.2%) is confirmed at the recovery address on CoreScan; residual ≈ 28.90M CORE (~29.8%) is estimate (drain − recovered). Team’s ~9M exchange-freeze claim is off-book and unverified on-chain. User distribution so far: 0.",
            sourceIds: ["b14g-recovery-x", "corescan-recovery", "bitquery-b14g", "pwn-b14g"]
          }
        ],
        figures: [
          {
            label: "CORE drained (Oct 31)",
            amount: "97,045,563 CORE (~$1.47M @ $0.0151)",
            confidence: "confirmed",
            sourceIds: ["bitquery-b14g", "pwn-b14g"]
          },
          {
            label: "CORE recovered (hard fork)",
            amount: "68,146,177.22 CORE (~70.2%)",
            confidence: "confirmed",
            sourceIds: ["b14g-recovery-x", "corescan-recovery", "tokenpost-b14g"]
          },
          {
            label: "Residual / outstanding",
            amount: "~28.90M CORE (~29.8%)",
            confidence: "estimate",
            sourceIds: ["b14g-recovery-x", "bitquery-b14g"]
          },
          {
            label: "Exchange freeze (team, 31 Oct)",
            amount: "~9M CORE of residual path (claimed; off-book)",
            confidence: "estimate",
            sourceIds: ["pwn-b14g", "bitquery-b14g"]
          },
          {
            label: "User distribution",
            amount: "0 so far (official)",
            confidence: "confirmed",
            sourceIds: ["b14g-recovery-x", "tokenpost-b14g"]
          },
          {
            label: "Recovery wallet",
            amount: "0xb85095fE01C1d95da3B1df0998ff5eDDcC9ac064",
            confidence: "confirmed",
            sourceIds: ["b14g-recovery-x", "corescan-recovery"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Primary impact is CORE on the Core chain inside b14g per-order staking contracts. Named attacker wallets in Oct 31 coverage include 0xc556ed208285406d71705927f92d4f4eaea579f1 (A) and 0x27758c30f8e424fbd8ca605bf31e9496c26ce92c (B).",
            sourceIds: ["bitquery-b14g", "pwn-b14g"]
          },
          {
            text: "BTC time-locks on the Bitcoin / Babylon side are claimed unaffected by b14g; Bitquery did not independently verify that side. Dual-staking TVL is mostly Bitcoin-denominated per DefiLlama snapshots cited in secondary coverage.",
            sourceIds: ["pwn-b14g", "bitquery-b14g"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Labels: b14g / Core · zero-amount staking withdrawal · 97,045,563 CORE drained · contracts paused · Core hard-fork state adjustment · 68,146,177.22 CORE recovered · residual ~28.9M · funds not distributed · fake recovery site warning · BTC time-locks claimed intact.",
            sourceIds: ["b14g-recovery-x", "bitquery-b14g", "pwn-b14g", "tokenpost-b14g", "corescan-recovery"]
          },
          {
            text: "Near-term user risk: phishing / fake recovery sites while recovered CORE sits undistributed. Residual ~29M CORE may already include mixed service/exchange paths; freezes are not the same as recovery. Distribution formula, eligibility, timeline, and recovery-wallet custody remain unpublished.",
            sourceIds: ["b14g-recovery-x", "bitquery-b14g", "tokenpost-b14g"]
          }
        ]
      }
    ]
  },
  {
    id: "mercado-bitcoin-drain-2026-11-02",
    title: "Mercado Bitcoin — multi-chain hot-wallet drain (~$40–49M, Nov 2)",
    occurredAt: "2026-11-02T06:19:00.000Z",
    status: "ACTIVE",
    amountSummary:
      "Active — Brazilian exchange’s multi-chain wallets drained; deposits and withdrawals paused; exchange says customers are covered; tracing and freezes ongoing.",
    chains: [
      "Multi-chain (~10–17 chains; ETH / BTC / SOL / Tron / Polygon / Arbitrum / Avalanche / BSC / Stellar / others)",
      "Ethereum (hot wallet + deposit-address sweeps)",
      "Bitcoin / Solana / Stellar / Tron (published attacker destinations)"
    ],
    background: {
      protocolType: "CEX",
      sizeMetrics: [
        {
          label: "Independent loss range",
          value: "~$40–49M across ~10–17 chains",
          asOf: "2026-11-02–03 independent tallies",
          confidence: "estimate",
          sourceIds: ["coindesk-mb", "chainalysis-mb", "bitquery-mb", "hypernative-press"]
        },
        {
          label: "Exchange figure (Mercado Bitcoin)",
          value: "~$38M",
          asOf: "2026-11-02 MB statements / partner update",
          confidence: "estimate",
          sourceIds: ["mb-update-1", "tokenpost-mb", "exame-mb"]
        },
        {
          label: "Chainalysis tally",
          value: "~$49M across 17 chains",
          asOf: "2026-11-02 Chainalysis response",
          confidence: "estimate",
          sourceIds: ["chainalysis-mb", "defiant-mb"]
        },
        {
          label: "Bitquery on-chain tally",
          value: "$48.5M on 10 chains ($47.2M ex thin-priced EVA)",
          asOf: "2026-11-02 Bitquery investigation",
          confidence: "confirmed",
          sourceIds: ["bitquery-mb"]
        },
        {
          label: "Partner freezes (so far)",
          value: "~$9–11M (Tether / Circle / Paxos / BRL1 / Chainalysis coordination)",
          asOf: "2026-11-02 MB + Chainalysis updates",
          confidence: "estimate",
          sourceIds: ["tokenpost-mb", "chainalysis-mb", "lookonchain-mb"]
        }
      ],
      notes: [
        {
          text: "Mercado Bitcoin is Brazil’s largest crypto exchange. This report covers an exchange custody / unauthorized-signing incident: attackers moved funds out of wallets the exchange controls (hot wallets and later deposit addresses) via plain signed outflows — not a published smart-contract exploit, and not the concurrent unnamed European entity exchange-account case.",
          sourceIds: ["mb-update-1", "bitquery-mb", "coindesk-mb", "chainalysis-mb"]
        }
      ]
    },
    sources: [
      {
        id: "mb-update-1",
        title: "Mercado Bitcoin help center — overnight security incident update (contained claim; customers covered; no data leak; deps/withdrawals paused)",
        url: "https://central.ajuda.mercadobitcoin.com.br/wiki/spaces/TF/pages/2965274628/9+56hs+09+11+2026+-+Atualiza+o"
      },
      {
        id: "mb-destinations",
        title: "Mercado Bitcoin help center — published attacker destination addresses (EVM / BTC / SOL / XLM / TRON)",
        url: "https://central.ajuda.mercadobitcoin.com.br/wiki/spaces/TF/pages/2965176322/11+56hs+02+11+2026+-+Atualiza+o"
      },
      {
        id: "mb-x-1",
        title: "Mercado Bitcoin (@MercadoBitcoin) — X statement on overnight security incident",
        url: "https://x.com/MercadoBitcoin/status/2117239507263132056"
      },
      {
        id: "mb-x-2",
        title: "Mercado Bitcoin (@MercadoBitcoin) — X follow-up with destination addresses / tracking",
        url: "https://x.com/MercadoBitcoin/status/2117395627529089233"
      },
      {
        id: "chainalysis-mb",
        title: "Chainalysis — response to Mercado Bitcoin (~$49M / 17 chains; freeze coordination ~$10M class)",
        url: "https://www.chainalysis.com/blog/chainalysis-response-mercado-bitcoin/"
      },
      {
        id: "bitquery-mb",
        title: "Bitquery — Mercado Bitcoin hack investigation ($48.5M / 10 chains; deposit sweeps; freezes)",
        url: "https://bitquery.io/investigations/mercado-bitcoin-hack"
      },
      {
        id: "coindesk-mb",
        title: "CoinDesk — Brazil’s Mercado Bitcoin halts withdrawals after ~$40M drained across 10 chains",
        url: "https://www.coindesk.com/business/2026/11/02/brazil-s-mercado-bitcoin-halts-withdrawals-after-usd40-million-drained-across-10-chains"
      },
      {
        id: "defiant-mb",
        title: "The Defiant — Chainalysis puts Mercado Bitcoin hack at $49 million across 17 chains",
        url: "https://thedefiant.io/news/hacks/chainalysis-puts-mercado-bitcoin-hack-at-49-million-across-17-chains"
      },
      {
        id: "tokenpost-mb",
        title: "TokenPost — Mercado Bitcoin partner freeze update (~$11M; Tether / Circle / Paxos / BRL1 / Chainalysis)",
        url: "https://www.tokenpost.com/news/technology/47206"
      },
      {
        id: "lookonchain-mb",
        title: "Lookonchain — Mercado Bitcoin attacker holdings / freeze follow-up",
        url: "https://x.com/lookonchain/status/2117430326880579833"
      },
      {
        id: "lookonchain-feed-mb",
        title: "Lookonchain feed — residual altcoin holdings attributed to Mercado Bitcoin attackers",
        url: "https://www.lookonchain.com/feeds/80066"
      },
      {
        id: "slowmist-mb",
        title: "SlowMist Hacked — Mercado Bitcoin entry (~$49M listed; attack method unknown)",
        url: "https://hacked.slowmist.io/en/"
      },
      {
        id: "exame-mb",
        title: "Exame — Mercado Bitcoin sofre ataque hacker (Brazilian press restatement)",
        url: "https://exame.com/future-of-money/mercado-bitcoin-sofre-ataque-hacker-estimado-em-r-2177-milhoes/"
      },
      {
        id: "hypernative-press",
        title: "CoinDesk / Hypernative early flag — plain-transfer outflows >$40M across ≥10 chains",
        url: "https://www.coindesk.com/business/2026/11/02/brazil-s-mercado-bitcoin-halts-withdrawals-after-usd40-million-drained-across-10-chains"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "On November 2, 2026, Mercado Bitcoin, Brazil’s largest crypto exchange, reported a security incident in which attackers moved cryptocurrency out of wallets the exchange controls across many blockchains. Independent estimates put the loss near $40–49 million. Transfers look like unauthorized signing of ordinary withdrawals, not a smart-contract bug. The exchange paused deposits and withdrawals, says customers will not lose funds and no personal data was leaked, and is working with partners who have frozen roughly $9–11 million so far. How the attackers obtained signing access has not been published. This case is separate from a concurrent report of large unauthorized withdrawals from an unnamed European entity’s accounts at other exchanges.",
            sourceIds: ["mb-update-1", "mb-x-1", "coindesk-mb", "bitquery-mb", "chainalysis-mb", "tokenpost-mb"]
          },
          {
            text: "Reading: exchange custody / signing compromise — hot wallets on many chains paid a shared attacker destination per chain, and later customer deposit addresses on Ethereum (and some Bitcoin deposits) also signed out balances. That pattern implies access to deposit key material or the signing pipeline, not only a single hot key, and is not a published smart-contract exploit.",
            sourceIds: ["bitquery-mb", "coindesk-mb", "chainalysis-mb"]
          },
          {
            text: "No public evidence tying this incident to the late-October Binance / TraderTraitor event was found this Eng pass; CoinDesk coverage likewise does not establish that link. Root cause (hot-wallet key leak, custody vendor, insider, deposit-derivation master key, payout-system compromise, or other) remains unpublished.",
            sourceIds: ["coindesk-mb", "mb-update-1", "bitquery-mb", "slowmist-mb"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "Late 1 Nov / early 2 Nov UTC: Bitquery notes some older Mercado Bitcoin Bitcoin addresses emptied; staging addresses funded on ETH/Tron the evening of 1 Nov.",
            sourceIds: ["bitquery-mb"]
          },
          {
            text: "2 Nov 2026 ~06:19–06:53 UTC (~14:19–14:53 HKT): main hot-wallet drain wave (~25–34 min) across ETH, SOL, Tron, Polygon, Arbitrum, Avalanche, BSC, Stellar, and others.",
            sourceIds: ["coindesk-mb", "bitquery-mb", "hypernative-press"]
          },
          {
            text: "2 Nov 2026 ~06:24–06:48 UTC: Ethereum hot wallet 0x5cc7787778b4d20a947dcc53b41f593cfd27d548 emptied (~2,852 ETH + USDT/USDC + ~185 other tokens; ~$29.5M class).",
            sourceIds: ["bitquery-mb"]
          },
          {
            text: "2 Nov ~02:30 AM ET: Mercado Bitcoin director contacts Chainalysis; law-enforcement and issuer freeze coordination begins.",
            sourceIds: ["chainalysis-mb"]
          },
          {
            text: "2 Nov morning UTC (~10–12 UTC window): early stablecoin freezes begin (Tether Polygon USDT0 ~10:21 UTC; then Tron/ETH; Paxos later).",
            sourceIds: ["bitquery-mb", "chainalysis-mb"]
          },
          {
            text: "2 Nov 2026 ~12:56 UTC (~20:56 HKT): Mercado Bitcoin official statement — identified and contained overnight; no customer harm; no data leak; deposits and withdrawals paused.",
            sourceIds: ["mb-update-1", "mb-x-1"]
          },
          {
            text: "2 Nov afternoon UTC (after 12:00): Ethereum deposit-address sweeps continue (Bitquery: 35,853 addresses emptied by ~15:44 UTC; ~$261k) — more than two hours after the “contained” claim.",
            sourceIds: ["bitquery-mb"]
          },
          {
            text: "2 Nov afternoon: Mercado Bitcoin publishes destination addresses (EVM / BTC / SOL / XLM / TRON) for ecosystem tracking.",
            sourceIds: ["mb-destinations", "mb-x-2"]
          },
          {
            text: "Later 2 Nov: Mercado Bitcoin update via press — partners froze ~$11M; named Tether, Circle, Paxos, BRL1, Chainalysis; more freezable funds identified.",
            sourceIds: ["tokenpost-mb", "chainalysis-mb"]
          },
          {
            text: "Through 3 Nov ~11:54 HKT Eng pass: deposits/withdrawals still reported paused; no public root-cause post-mortem; no attribution; majority of non-stable value still in attacker wallets.",
            sourceIds: ["mb-update-1", "bitquery-mb", "coindesk-mb", "slowmist-mb"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "Mercado Bitcoin: primary official acknowledgment — overnight security incident identified and claimed contained; customers will not lose funds (exchange absorbs the hit); no personal data leak; deposits and withdrawals paused; destination addresses published for monitoring; partner freeze coordination ongoing.",
            sourceIds: ["mb-update-1", "mb-destinations", "mb-x-1", "mb-x-2", "tokenpost-mb"]
          },
          {
            text: "Chainalysis: published response putting the loss near ~$49M across 17 chains and describing freeze coordination in the nearly-$10M class after Mercado Bitcoin contact.",
            sourceIds: ["chainalysis-mb", "defiant-mb"]
          },
          {
            text: "Bitquery: published independent on-chain investigation ($48.5M / 10 chains; Ethereum ~61%; deposit-address mass sweeps; freeze snapshots).",
            sourceIds: ["bitquery-mb"]
          },
          {
            text: "Stablecoin issuers and partners (Tether, Circle, Paxos, BRL1 per Mercado Bitcoin / TokenPost restatement) participated in freezes totaling roughly $9–11M depending on snapshot; Bitquery’s earlier afternoon snapshot showed Circle freezes still open at that moment.",
            sourceIds: ["tokenpost-mb", "chainalysis-mb", "bitquery-mb"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "CoinDesk covers the halt of withdrawals after ~$40M drained across ~10 chains and notes Hypernative’s early plain-transfer outflow flag; The Defiant restates Chainalysis’s ~$49M / 17-chain figure.",
            sourceIds: ["coindesk-mb", "defiant-mb", "hypernative-press"]
          },
          {
            text: "Lookonchain tracks attacker holdings and residual altcoins; SlowMist lists the incident (~$49M; attack method unknown); Exame and TokenPost restate Brazilian-exchange and partner-freeze updates.",
            sourceIds: ["lookonchain-mb", "lookonchain-feed-mb", "slowmist-mb", "exame-mb", "tokenpost-mb"]
          },
          {
            text: "Press coverage does not establish a confirmed link to the late-October Binance incident; treat any “shared vendor / BitMart” hypotheses from pre-drain non-MB outflows as unconfirmed.",
            sourceIds: ["coindesk-mb", "bitquery-mb"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "Status ACTIVE — not CONTAINED and not RESOLVED: root cause and attribution unpublished; deposits and withdrawals still paused; deposit-address sweeps continued after the exchange’s “contained” statement; partner freezes cover only a minority (~$9–11M) while the majority of stolen value (BTC / ETH / SOL / XLM / AVAX / alts) remains in attacker-controlled wallets.",
            sourceIds: ["mb-update-1", "bitquery-mb", "tokenpost-mb", "chainalysis-mb", "coindesk-mb"]
          },
          {
            text: "Keep ACTIVE until (a) an official root-cause / post-mortem, (b) deposits and withdrawals resume with deposit-address rotation, (c) material additional freezes or law-enforcement seizures covering residual value, or (d) a closed recovery outcome. Do not merge this report with the concurrent unnamed European entity exchange-account case.",
            sourceIds: ["mb-update-1", "bitquery-mb", "coindesk-mb", "chainalysis-mb"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "Dollar tallies cluster around ~$40–49M: Mercado Bitcoin cites ~$38M; Hypernative early flag >$40M; Arkham/Lookonchain ~$46–46.5M class; Chainalysis ~$49M across 17 chains; Bitquery $48.5M on 10 chains (ETH ~$29.5M / ~61%). Treat exchange vs independent figures as separately labeled estimates vs on-chain confirmed where noted.",
            sourceIds: ["mb-update-1", "coindesk-mb", "chainalysis-mb", "bitquery-mb", "lookonchain-mb", "defiant-mb"]
          },
          {
            text: "Partner freezes are roughly $9–11M (MB ~$11M claim; Chainalysis nearly $10M facilitated; Lookonchain >$9M). About 75–85% of stolen value sits in non-issuer-freezable assets, so freeze progress is not full recovery.",
            sourceIds: ["tokenpost-mb", "chainalysis-mb", "lookonchain-mb", "bitquery-mb"]
          }
        ],
        figures: [
          {
            label: "Independent loss range",
            amount: "~$40–49M (multi-chain)",
            confidence: "estimate",
            sourceIds: ["coindesk-mb", "chainalysis-mb", "bitquery-mb"]
          },
          {
            label: "Exchange figure (Mercado Bitcoin)",
            amount: "~$38M",
            confidence: "estimate",
            sourceIds: ["mb-update-1", "tokenpost-mb", "exame-mb"]
          },
          {
            label: "Chainalysis tally",
            amount: "~$49M across 17 chains",
            confidence: "estimate",
            sourceIds: ["chainalysis-mb", "defiant-mb"]
          },
          {
            label: "Bitquery on-chain tally",
            amount: "$48.5M on 10 chains ($47.2M ex thin-priced EVA)",
            confidence: "confirmed",
            sourceIds: ["bitquery-mb"]
          },
          {
            label: "Ethereum hot-wallet drain (Bitquery)",
            amount: "~$29.5M from 0x5cc7…d548 (~2,852 ETH + stables + ~185 tokens)",
            confidence: "confirmed",
            sourceIds: ["bitquery-mb"]
          },
          {
            label: "Partner freezes (so far)",
            amount: "~$9–11M (Tether / Circle / Paxos / BRL1 / Chainalysis)",
            confidence: "estimate",
            sourceIds: ["tokenpost-mb", "chainalysis-mb", "lookonchain-mb"]
          },
          {
            label: "Ethereum deposit-address sweeps (post-statement)",
            amount: "~$261k across 35,853 addresses by ~15:44 UTC 2 Nov",
            confidence: "confirmed",
            sourceIds: ["bitquery-mb"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Impact spans roughly 10–17 blockchains depending on tally method (Bitquery 10; Chainalysis 17), with Ethereum the largest single slice, then Bitcoin, plus SOL, Tron, Polygon, Arbitrum, Avalanche, BSC, Stellar, and others. Pattern is plain signed outflows from exchange-controlled wallets, not a chain-level consensus failure.",
            sourceIds: ["bitquery-mb", "chainalysis-mb", "coindesk-mb"]
          },
          {
            text: "Mercado Bitcoin published attacker destinations for tracking: EVM 0xe485e7A70b1131216Cb47CA4555c4Bbb2C742478; BTC 19qGpsHvzh1t6pVi526XNNkh6hW6prDZp; SOL 3YX6WHncP1Ra4AotE9YLawFt4nPmxyux288FWXkEW97J; XLM GDXYRI6IONQA5YTGRLQ603FGJ2BWXPJTTQPUXFPSEXSRKBZLFKMZSOLP; TRON TEX3HuDRHRa3tnYpy96M4UfSx62VhDyA5L. Bitquery additionally names drained Ethereum hot wallet 0x5cc7787778b4d20a947dcc53b41f593cfd27d548; analysts track many follow-on wallets beyond the five published destinations.",
            sourceIds: ["mb-destinations", "mb-x-2", "bitquery-mb", "lookonchain-mb"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Labels: Mercado Bitcoin · Brazil’s largest crypto exchange · multi-chain hot-wallet + deposit drain · ~$40–49M independent / ~$38M exchange · plain signed withdrawals / exchange custody · deps/withdrawals paused · customers covered claim · no data leak claim · ~$9–11M freezes · distinct from unnamed EU entity exchange-account case · ACTIVE.",
            sourceIds: ["mb-update-1", "coindesk-mb", "bitquery-mb", "chainalysis-mb", "tokenpost-mb"]
          },
          {
            text: "Near-term user risk: phishing and fake recovery offers while deposits/withdrawals stay paused and residual BTC/ETH/SOL piles remain liquid. Do not invent a root cause or merge this case with the concurrent European entity exchange-account report. Watch for post-mortem, address rotation, additional freezes, and large dumps or bridge exits.",
            sourceIds: ["mb-update-1", "bitquery-mb", "coindesk-mb", "lookonchain-mb"]
          }
        ]
      }
    ]
  },
  {
    id: "btcpay-server-hot-wallet-sweeps-2026-11-01",
    title: "BTCPay Server — hot-wallet sweeps / emergency shutdown",
    occurredAt: "2026-11-01T22:25:56.000Z",
    status: "ACTIVE",
    amountSummary:
      "Loss total and instance count undisclosed; multiple self-hosted instances reported swept; SlowMist listed with unknown amount",
    chains: ["Bitcoin (self-hosted BTCPay Server hot wallets)"],
    background: {
      protocolType: "merchant infra",
      notes: [
        {
          text: "BTCPay Server is open-source self-hosted Bitcoin payment processor software. This report covers unauthorized hot-wallet sweeps on operator-run instances and the official version-scope IR that targets builds 2.4.1 (Jul 23, 2026) or older.",
          sourceIds: ["btcpay-x-alert", "btcpay-x-ir", "btcpay-wallet-docs"]
        }
      ]
    },
    sources: [
      {
        id: "btcpay-x-alert",
        title: "BTCPay Server (@BtcpayServer) — emergency alert: hot wallets swept; shut down with ./btcpay-down.sh",
        url: "https://x.com/BtcpayServer/status/2117020340815819262"
      },
      {
        id: "btcpay-x-ir",
        title: "BTCPay Server (@BtcpayServer) — IR: attack vector targets 2.4.1 or older; no credible drains on 2.4.7",
        url: "https://x.com/BtcpayServer/status/2117106238123123008"
      },
      {
        id: "btcpay-x-hosts",
        title: "BTCPay Server (@BtcpayServer) — hosts may auto-shut older instances; thanks LunaNode",
        url: "https://x.com/BtcpayServer/status/2117106240098611681"
      },
      {
        id: "dorier-prelim",
        title: "Nicolas Dorier (@NicolasDorier) — founder preliminary: admin login; reports before 2.4.2; blog promised",
        url: "https://x.com/NicolasDorier/status/2117051298633900041"
      },
      {
        id: "btcpay-wallet-docs",
        title: "BTCPay Wallet docs — hot-wallet architecture (keys on server)",
        url: "https://docs.btcpayserver.org/Wallet/"
      },
      {
        id: "btcpay-create-wallet",
        title: "BTCPay Create a wallet docs — hot wallet stores private key on the server",
        url: "https://docs.btcpayserver.org/CreateWallet/"
      },
      {
        id: "btcpay-advisory-242",
        title: "BTCPay Security Advisory 2.4.2 — Aug 2026 LND macaroon incident; hot wallets declared unaffected then",
        url: "https://blog.btcpayserver.org/security-advisory-btcpay-server-2-4-2/"
      },
      {
        id: "btcpay-release-247",
        title: "BTCPay GitHub release v2.4.7 — Anthropic OSS Scanner findings (adjacent; not confirmed as this vector’s patch)",
        url: "https://github.com/btcpayserver/btcpayserver/releases/tag/v2.4.7"
      },
      {
        id: "btcpay-x-247",
        title: "BTCPay (@BtcpayServer) — emergency 2.4.7 announcement (29 Oct; link to Nov 1 sweeps unconfirmed)",
        url: "https://x.com/BtcpayServer/status/2115835402536079674"
      },
      {
        id: "defiant-btcpay",
        title: "The Defiant — BTCPay urges shutdown after reports of hot-wallet sweeps",
        url: "https://thedefiant.io/news/hacks/btcpay-server-urges-shutdown-after-reports-of-hot-wallet-sweeps"
      },
      {
        id: "tokenpost-btcpay",
        title: "TokenPost — BTCPay founder older-versions framing restatement",
        url: "https://www.tokenpost.com/news/technology/46072"
      },
      {
        id: "slowmist-home",
        title: "SlowMist Hacked — BTCPay Server listed 2026-11-01; amount -; method Unknown",
        url: "https://hacked.slowmist.io/en/"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "Official @BtcpayServer reported unauthorized attackers sweeping hot wallets on running self-hosted BTCPay Server instances and told operators to shut down with ./btcpay-down.sh until the investigation completes. That emergency shutdown instruction has not been formally rescinded in a later all-clear.",
            sourceIds: ["btcpay-x-alert", "defiant-btcpay"]
          },
          {
            text: "A follow-up official IR stated the attack vector targets instances running versions 2.4.1 (Jul 23, 2026) or older, with no credible reports of hot-wallet drains for operators on the latest 2.4.7 release. Operators were urged to keep BTCPay Server updated; impacted operators were asked to email security@btcpayserver.org with details and logs.",
            sourceIds: ["btcpay-x-ir"]
          },
          {
            text: "This is a self-hosted merchant-software / server-side hot-wallet incident (keys or seeds stored on the operator’s BTCPay box when hot-wallet mode is enabled), not a Bitcoin L1 consensus failure and not a CEX custodial drain. Per BTCPay docs, creating a hot wallet keeps the private key on the server so BTCPay can sign spends.",
            sourceIds: ["btcpay-x-alert", "btcpay-wallet-docs", "btcpay-create-wallet"]
          },
          {
            text: "Founder @NicolasDorier (preliminary, not formal IR) said affected instances showed attacker admin login, that reports appear before 2.4.2, and that traces point to pre-2.4.2 vulnerabilities being used, with a blog post promised. Official IR wording (≤2.4.1) is the status scope used here; treat founder “before / above 2.4.2” language as aligned on older builds, not as a formal all-clear. Do not claim 2.4.7 is a confirmed patch for this vector, invent a USD or instance count, publish an exact admin-login entry path, or treat the August 2026 LND-macaroon advisory as confirmed linkage unless a later official write-up says so.",
            sourceIds: ["dorier-prelim", "btcpay-x-ir", "btcpay-advisory-242", "btcpay-release-247", "btcpay-x-247", "tokenpost-btcpay"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "7–8 Aug 2026: prior LND macaroon credential incident; advisory to update to 2.4.2; official then confirmed BTCPay on-chain/hot wallets were not affected by that flaw. Treat as historical / separate unless a later official post links it.",
            sourceIds: ["btcpay-advisory-242"]
          },
          {
            text: "29 Oct 2026 ~15:57 UTC: @BtcpayServer emergency 2.4.7 (Anthropic OSS Scanner findings). Official IR later noted no credible drains on 2.4.7 for this Nov event; that is not the same as confirming 2.4.7 as the patch that closed this vector.",
            sourceIds: ["btcpay-x-247", "btcpay-release-247", "btcpay-x-ir"]
          },
          {
            text: "Undisclosed start: hot-wallet sweeps begin on some instances (official only: “receiving reports”).",
            sourceIds: ["btcpay-x-alert"]
          },
          {
            text: "1 Nov 2026 22:25:56 UTC (~06:26 HKT 2 Nov): @BtcpayServer emergency alert — hot wallets being swept; shut down with ./btcpay-down.sh until investigation completes.",
            sourceIds: ["btcpay-x-alert"]
          },
          {
            text: "2 Nov 2026 00:28:57 UTC (~08:28 HKT): @NicolasDorier preliminary — public servers on 2.4.7 not attacked; reports appear before 2.4.2; attacker logged in as admin; still figuring out how (founder, not formal IR).",
            sourceIds: ["dorier-prelim", "tokenpost-btcpay"]
          },
          {
            text: "2 Nov 2026 04:07:15 UTC (~12:07 HKT): @BtcpayServer IR — attack vector targets versions 2.4.1 (Jul 23, 2026) or older; no credible reports of drains on latest 2.4.7; keep updated; report to security@btcpayserver.org.",
            sourceIds: ["btcpay-x-ir"]
          },
          {
            text: "2 Nov 2026 04:07:16 UTC (~12:07 HKT): @BtcpayServer hosts reply — hosting providers may have auto-shut older instances; thanks @LunaNode and other hosts.",
            sourceIds: ["btcpay-x-hosts"]
          },
          {
            text: "Through this Update: SlowMist Hacked lists BTCPay Server (2026-11-01) with amount “-” and method Unknown; no formal all-clear, blog advisory, or new GHSA for this Nov event found; DefiLlama still shows no BTCPay row in cited sources.",
            sourceIds: ["slowmist-home", "btcpay-x-ir", "btcpay-x-alert", "defiant-btcpay"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "BTCPay Server (@BtcpayServer): primary official ACK — emergency shutdown, then IR version-scope (≤2.4.1 / no credible drains on 2.4.7), host auto-shutdown thanks, and security@ intake for impacted operators. Investigation ongoing; no formal all-clear in IR text.",
            sourceIds: ["btcpay-x-alert", "btcpay-x-ir", "btcpay-x-hosts"]
          },
          {
            text: "Hosting providers (e.g. LunaNode): official reply says some hosts may already have shut older instances automatically after the initial alert to keep outdated builds from being exploited.",
            sourceIds: ["btcpay-x-hosts"]
          },
          {
            text: "Nicolas Dorier (founder): preliminary admin-login and before-2.4.2 framing; blog promised. Cite as founder commentary, not a substitute for the official IR.",
            sourceIds: ["dorier-prelim", "tokenpost-btcpay", "btcpay-x-ir"]
          },
          {
            text: "SlowMist Hacked: lists BTCPay Server dated 2026-11-01 with amount “-” and method Unknown — listed, but no loss figure.",
            sourceIds: ["slowmist-home"]
          },
          {
            text: "August 2026 LND advisory remains published historical context; official Nov IR does not publish a confirmed technical linkage to that earlier flaw.",
            sourceIds: ["btcpay-advisory-242", "btcpay-x-ir", "dorier-prelim"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "The Defiant restates the official emergency shutdown and notes the early absence of loss, version, and patch detail — secondary press, not an independent loss ledger.",
            sourceIds: ["defiant-btcpay", "btcpay-x-alert"]
          },
          {
            text: "TokenPost restates founder older-version / admin-login framing around the IR window — secondary press of founder comments, not formal IR.",
            sourceIds: ["tokenpost-btcpay", "dorier-prelim"]
          },
          {
            text: "SlowMist lists the event with a blank amount and Unknown method. No confirmed DefiLlama hacks row for this event appears in cited sources — do not invent firm method or USD fields.",
            sourceIds: ["slowmist-home", "btcpay-x-ir"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "Status ACTIVE (version-scoped) — not CONTAINED and not RESOLVED: official IR narrows the attack vector to versions 2.4.1 or older and reports no credible drains on latest 2.4.7, but the original ./btcpay-down.sh instruction was not formally all-cleared in IR text, the admin-login entry path is not fully published, loss totals remain undisclosed, and no blog advisory / GHSA / new incident-specific release for this Nov event was found in cited sources.",
            sourceIds: ["btcpay-x-ir", "btcpay-x-alert", "dorier-prelim", "slowmist-home"]
          },
          {
            text: "Containment so far is partial: version scope + update urging + some host auto-shutdowns of older instances + operator-side ./btcpay-down.sh. Do not flip status until BTCPay publishes a formal all-clear or scoped advisory/patch write-up, clearer guidance for previously online hot-wallet seeds, and residual accounting.",
            sourceIds: ["btcpay-x-ir", "btcpay-x-hosts", "btcpay-x-alert"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "Official loss total, affected instance count, and named drained merchants are undisclosed. Cite qualitative “reports” / secondary “multiple” language only — do not invent a dollar figure.",
            sourceIds: ["btcpay-x-alert", "btcpay-x-ir", "defiant-btcpay", "slowmist-home"]
          }
        ],
        figures: [
          {
            label: "Official loss total",
            amount: "Not disclosed",
            confidence: "estimate",
            sourceIds: ["btcpay-x-alert", "btcpay-x-ir", "slowmist-home"]
          },
          {
            label: "Affected instance count",
            amount: "Not disclosed (\"reports\" / press \"multiple\")",
            confidence: "estimate",
            sourceIds: ["btcpay-x-alert", "defiant-btcpay"]
          },
          {
            label: "SlowMist listed loss",
            amount: "— (listed 2026-11-01; amount blank; method Unknown)",
            confidence: "estimate",
            sourceIds: ["slowmist-home"]
          },
          {
            label: "Operational impact",
            amount: "Self-hosted payment acceptance halted while operators stay offline; some hosts auto-shut older boxes",
            confidence: "confirmed",
            sourceIds: ["btcpay-x-alert", "btcpay-x-hosts"]
          },
          {
            label: "Official containment instruction",
            amount: "./btcpay-down.sh; remain offline until investigation completes (not formally all-cleared in IR text)",
            confidence: "confirmed",
            sourceIds: ["btcpay-x-alert", "btcpay-x-ir"]
          },
          {
            label: "IR version scope",
            amount: "Vector targets 2.4.1 (Jul 23, 2026) or older; no credible drains reported on latest 2.4.7",
            confidence: "confirmed",
            sourceIds: ["btcpay-x-ir"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Impact is framed as Bitcoin funds held in self-hosted BTCPay Server hot wallets — not a Bitcoin L1 consensus compromise.",
            sourceIds: ["btcpay-x-alert", "btcpay-wallet-docs"]
          },
          {
            text: "Watch-only / hardware-signed / PSBT deployments keep private keys off the server and are likely lower direct spend risk. Official IR lowers direct drain evidence for operators already on latest 2.4.7, but the original alert still told anyone running an instance to shut down pending investigation until a formal all-clear.",
            sourceIds: ["btcpay-x-alert", "btcpay-x-ir", "btcpay-create-wallet"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Labels: BTCPay Server hot-wallet sweeps · official IR vector ≤2.4.1 (Jul 23, 2026) · no credible drains on 2.4.7 (official) · admin login on affected instances (founder) · ./btcpay-down.sh (not formally all-cleared) · LunaNode / hosts auto-shutdown · SlowMist listed (amount unknown) · loss/instance count undisclosed · blog / GHSA / new release pending · pre-2.4.2 vuln traces provisional (founder).",
            sourceIds: ["btcpay-x-ir", "btcpay-x-alert", "btcpay-x-hosts", "dorier-prelim", "slowmist-home", "btcpay-advisory-242", "defiant-btcpay"]
          },
          {
            text: "Primary exposure per official IR: self-hosted operators on versions 2.4.1 or older with enabled hot wallets. Operators on latest 2.4.7 have no credible drain reports in the IR, but should keep updated. Merchants and customers of affected stores face payment-acceptance disruption while instances stay offline; fund loss applies only if a hot wallet was swept. Hosted tenants may already have been auto-shut by some providers.",
            sourceIds: ["btcpay-x-ir", "btcpay-x-hosts", "btcpay-wallet-docs", "defiant-btcpay"]
          }
        ]
      }
    ]
  },
  {
    id: "solana-mobile-skr-claim-dapp-store-phishing-2026-11-01",
    title: "Solana Mobile — “SKR Claim” dApp Store Spotlight seed-phrase phishing",
    occurredAt: "2026-11-01T18:34:40.000Z",
    status: "CONTAINED",
    amountSummary:
      "USD loss undisclosed; install / victim counts undisclosed; seed-phrase phishing via curated Spotlight/Quests",
    chains: ["Solana Mobile dApp Store (Seeker ecosystem; not an L1 contract exploit)"],
    background: {
      protocolType: "mobile store",
      notes: [
        {
          text: "Solana Mobile operates the Solana dApp Store (Seeker ecosystem); this report covers a curated Spotlight/Quests seed-phrase phishing path via a malicious third-party app.",
          sourceIds: ["solanamobile-x"]
        }
      ]
    },
    sources: [
      {
        id: "solanamobile-x",
        title: "Solana Mobile (@solanamobile) — official disclosure: SKR Claim Spotlight phishing; portal access; unpublished-link patch",
        url: "https://x.com/solanamobile/status/2116962140301266959"
      },
      {
        id: "cryptobriefing-skr",
        title: "CryptoBriefing — long-form; Seed Vault/on-chain “not compromised” press attribution + migrate-funds advice",
        url: "https://cryptobriefing.com/solana-mobile-patches-bug-malicious-app-dapp-portal/"
      },
      {
        id: "defiant-skr",
        title: "The Defiant — Solana Mobile says fake SKR Claim app reached Store Spotlight",
        url: "https://thedefiant.io/news/hacks/solana-mobile-says-fake-skr-claim-app-reached-store-spotlight"
      },
      {
        id: "panews-skr",
        title: "PANews — Solana Mobile dApp Store malicious SKR Claim restatement",
        url: "https://www.panews.io/articles/01a19877-acd7-739b-adf0-78d8b5ecdd9b"
      },
      {
        id: "chaincatcher-skr",
        title: "ChainCatcher — flash restatement of official Solana Mobile disclosure",
        url: "https://www.chaincatcher.com/en/article/2300847"
      },
      {
        id: "slowmist-home",
        title: "SlowMist Hacked — no SKR Claim / Solana Mobile dApp Store row this Eng pass",
        url: "https://hacked.slowmist.io/en/"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "Official @solanamobile: on 1 Nov 2026 a malicious third-party app named “SKR Claim” was submitted to the Solana dApp Store. After unauthorized access to the dApp Publishing Portal, the App Spotlight and Quests UIs were updated so the app appeared in curated surfaces. The app requested user seed phrases.",
            sourceIds: ["solanamobile-x", "defiant-skr", "panews-skr"]
          },
          {
            text: "Official says the app was live on dApp Spotlight for one hour, then removed from the Store, and is currently being removed from devices where it was installed. Engineers identified and patched a bug that allowed linking to apps that were not fully published. Solana Mobile states it will never ask for a seed phrase, crypto, or wallet-connect to claim airdrops.",
            sourceIds: ["solanamobile-x"]
          },
          {
            text: "This is a mobile dApp Store / publishing-portal + curated-placement phishing incident (seed harvest), not an on-chain smart-contract exploit. The official note_tweet does not assert Seed Vault hardware compromise. CryptoBriefing attributes a company confirmation that device security, Seed Vault, and on-chain systems were not compromised — treat that as press-only until a primary source is found.",
            sourceIds: ["solanamobile-x", "cryptobriefing-skr"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "1 Nov 2026 afternoon UTC (exact Spotlight start unconfirmed): unauthorized access to the dApp Publishing Portal; App Spotlight + Quests UI updated; malicious “SKR Claim” surfaced and requested seed phrases. Official duration: live on Spotlight for one hour before Store removal.",
            sourceIds: ["solanamobile-x"]
          },
          {
            text: "1 Nov 2026 18:34:40 UTC (~02:34 HKT 2 Nov): @solanamobile disclosure note_tweet posts full incident ACK, unpublished-link patch, and anti-phishing reminder.",
            sourceIds: ["solanamobile-x"]
          },
          {
            text: "~18:46 UTC 1 Nov onward: CryptoBriefing, The Defiant, PANews, ChainCatcher and other outlets restate or expand on the official note; CryptoBriefing adds Seed Vault/on-chain non-compromise and migrate-funds advice (press attribution).",
            sourceIds: ["cryptobriefing-skr", "defiant-skr", "panews-skr", "chaincatcher-skr"]
          },
          {
            text: "Through this Eng pass: no newer @solanamobile post found after the disclosure; SlowMist Hacked shows no SKR Claim / Solana Mobile row; no official blog post-mortem located.",
            sourceIds: ["solanamobile-x", "slowmist-home"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "Solana Mobile (@solanamobile): primary official ACK — Store removal, device wipe in progress, unpublished-app linking bug patched, and anti-phishing reminder.",
            sourceIds: ["solanamobile-x"]
          },
          {
            text: "SlowMist Hacked: no SKR Claim / Solana Mobile dApp Store entry found this Eng pass — do not invent a SlowMist loss row.",
            sourceIds: ["slowmist-home"]
          },
          {
            text: "Attacker identity and Publishing Portal access method remain undisclosed in the official note.",
            sourceIds: ["solanamobile-x"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "The Defiant, PANews, and ChainCatcher largely restate official facts (Spotlight placement, seed-phrase request, ~1 hour exposure, removal/patch) — secondary press, not an independent victim ledger.",
            sourceIds: ["defiant-skr", "panews-skr", "chaincatcher-skr", "solanamobile-x"]
          },
          {
            text: "CryptoBriefing expands with Seed Vault / device / on-chain “not compromised,” a broader security review, and migrate-funds guidance for users who entered seeds — cite as secondary; do not elevate those claims to official until a primary source appears.",
            sourceIds: ["cryptobriefing-skr", "solanamobile-x"]
          },
          {
            text: "This Eng pass found no SlowMist or DefiLlama SKR Claim row and no PeckShield/BlockSec/CertiK write-up naming the app.",
            sourceIds: ["slowmist-home", "solanamobile-x"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "Status CONTAINED — not RESOLVED: curated Spotlight/Quests placement is claimed stopped and the unpublished-link bug is claimed patched, but device wipe is still “currently being removed,” portal access root-cause is unexplained, install/victim/USD figures are undisclosed, and no post-mortem has published.",
            sourceIds: ["solanamobile-x"]
          },
          {
            text: "Not ACTIVE: no evidence of ongoing curated Spotlight placement this pass. Residual risk remains for any user who entered a seed phrase, and for unfinished wipe plus unexplained portal access.",
            sourceIds: ["solanamobile-x", "cryptobriefing-skr"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "Official disclosure gives no USD, SOL, install, or seed-enter victim counts. SlowMist and DefiLlama show no matching loss row this pass — do not invent a dollar figure.",
            sourceIds: ["solanamobile-x", "slowmist-home", "defiant-skr"]
          }
        ],
        figures: [
          {
            label: "Spotlight exposure (official)",
            amount: "~1 hour",
            confidence: "confirmed",
            sourceIds: ["solanamobile-x"]
          },
          {
            label: "USD / token cash loss",
            amount: "Not disclosed",
            confidence: "estimate",
            sourceIds: ["solanamobile-x", "slowmist-home"]
          },
          {
            label: "Install / seed-enter victims",
            amount: "Not disclosed",
            confidence: "estimate",
            sourceIds: ["solanamobile-x"]
          },
          {
            label: "SlowMist listed loss",
            amount: "n/a (no entry this pass)",
            confidence: "estimate",
            sourceIds: ["slowmist-home"]
          },
          {
            label: "Store placement / patch",
            amount: "Listing removed; unpublished-link bug patched",
            confidence: "confirmed",
            sourceIds: ["solanamobile-x"]
          },
          {
            label: "Device wipe",
            amount: "In progress (“currently being removed”)",
            confidence: "confirmed",
            sourceIds: ["solanamobile-x"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Surface is the Solana Mobile dApp Store (Seeker-primary ecosystem). Official framing is store/portal-layer phishing, not a Solana L1 contract exploit.",
            sourceIds: ["solanamobile-x", "defiant-skr"]
          },
          {
            text: "Official note_tweet does not assert Seed Vault hardware or on-chain system compromise; press non-compromise claims remain secondary until primary-sourced.",
            sourceIds: ["solanamobile-x", "cryptobriefing-skr"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Labels: Solana Mobile dApp Store · SKR Claim seed-phrase phishing · App Spotlight / Quests · dApp Publishing Portal unauthorized access · unpublished-app linking bug patched · ~1 hour exposure · device wipe in progress · USD / victims undisclosed · SlowMist/DefiLlama unlisted (this pass).",
            sourceIds: ["solanamobile-x", "slowmist-home", "defiant-skr"]
          },
          {
            text: "Highest residual risk: users who entered a seed into “SKR Claim.” Users who only saw the listing without installing or entering a seed have lower direct exposure. Official guidance: Solana Mobile will never ask for seed phrase, crypto, or wallet-connect to claim airdrops.",
            sourceIds: ["solanamobile-x", "cryptobriefing-skr"]
          }
        ]
      }
    ]
  },
  {
    id: "zachxbt-eu-cex-theft-2026-11-01",
    title: "Suspected $106M+ unauthorized withdrawals from EU entity exchange accounts (Nov 1)",
    occurredAt: "2026-11-01T12:25:00.000Z",
    status: "ACTIVE",
    amountSummary:
      "Active investigation — large suspected theft from multiple exchange accounts; funds moved into ETH, instant-swap services, and Monero; victim not publicly named.",
    chains: [
      "Ethereum (USDC withdrawals + UniswapX ETH concentration)",
      "Monero (Wagyu / LI.FI path; XMR side opaque)",
      "Multi-bridge exits (~$7.10M net via six bridges/routers)"
    ],
    background: {
      protocolType: "CEX",
      sizeMetrics: [
        {
          label: "Suspected loss (ZachXBT)",
          value: ">$106M",
          asOf: "2026-11-02 ZachXBT alert",
          confidence: "estimate",
          sourceIds: ["zachxbt-tg", "coindesk-eu", "defiant-eu"]
        },
        {
          label: "Traced USDC outflows (Bitquery)",
          value: "$108.80M USDC from Kraken, Crypto.com, and OKX → 15 wallets",
          asOf: "2026-11-01–02 window",
          confidence: "confirmed",
          sourceIds: ["bitquery-eu"]
        },
        {
          label: "UniswapX stables → ETH",
          value: "$62.98M → 27,553 ETH (~4 hours)",
          asOf: "2026-11-01 23:44 UTC – 2026-11-02 04:02 UTC",
          confidence: "confirmed",
          sourceIds: ["bitquery-eu"]
        },
        {
          label: "Still on Ethereum (Bitquery snapshot)",
          value: "~$78.27M in thief-tied addresses (mostly ETH); ~$3.74M USDC freezable",
          asOf: "2026-11-02 13:47 UTC",
          confidence: "estimate",
          sourceIds: ["bitquery-eu"]
        }
      ],
      notes: [
        {
          text: "This report covers suspected unauthorized withdrawals from an unnamed European entity’s accounts at several centralized exchanges. On-chain pattern fits customer-side compromise (exchange logins and/or wallet allowlists), not an exchange hot-wallet or treasury breach.",
          sourceIds: ["zachxbt-tg", "bitquery-eu", "coindesk-eu"]
        }
      ]
    },
    sources: [
      {
        id: "zachxbt-tg",
        title: "ZachXBT (@investigations) — Telegram alert #372: suspected >$106M theft from unnamed EU entity CEX accounts",
        url: "https://t.me/investigations/372"
      },
      {
        id: "bitquery-eu",
        title: "Bitquery — EU $106M crypto theft investigation ($108.80M USDC; Kraken / Crypto.com / OKX; residual ETH)",
        url: "https://bitquery.io/investigations/eu-106m-crypto-theft"
      },
      {
        id: "coindesk-eu",
        title: "CoinDesk — EU entity suspected of losing $106M from crypto exchange accounts, ZachXBT says",
        url: "https://www.coindesk.com/tech/2026/11/02/eu-entity-suspected-of-losing-usd106-million-from-crypto-exchange-accounts-zachxbt-says"
      },
      {
        id: "defiant-eu",
        title: "The Defiant — ZachXBT flags suspected $106M+ theft from EU entity",
        url: "https://thedefiant.io/news/hacks/zachxbt-flags-suspected-106-million-plus-theft-from-eu-entity"
      },
      {
        id: "techflow-eu",
        title: "TechFlow — press restatement of ZachXBT EU-entity exchange-account theft alert",
        url: "https://www.techflowpost.com/en-US/newsletter/142521"
      },
      {
        id: "cryptotimes-eu",
        title: "Crypto Times — ZachXBT alert restatement with published address-list transcription",
        url: "https://www.cryptotimes.io/2026/11/02/crypto-sleuth-zachxbt-flags-106m-theft-from-eu-entitys-exchange-accounts/"
      },
      {
        id: "unchained-eu",
        title: "Unchained — $106M suspected stolen from EU entity as funds flow into Monero, ZachXBT",
        url: "https://unchainedcrypto.com/106-million-suspected-stolen-from-eu-entity-as-funds-flow-into-monero-zachxbt/"
      },
      {
        id: "theblock-x-eu",
        title: "The Block (@TheBlockCo) — restatement of ZachXBT EU-entity theft alert",
        url: "https://x.com/TheBlockCo/status/2117237652726706179"
      },
      {
        id: "degennews-x-eu",
        title: "DegenerateNews — restatement of ZachXBT EU-entity theft alert",
        url: "https://x.com/DegenerateNews/status/2117234043548729471"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "On November 1–2, 2026, on-chain investigators reported that an unnamed European entity may have lost more than $100 million from accounts at several centralized exchanges. Traced withdrawals left mainly as USDC from Kraken, Crypto.com, and OKX, were largely swapped into ETH, and partly routed through instant-exchange services and toward Monero. Neither the victim nor the exchanges have publicly confirmed the loss. Related wallet addresses have been published for monitoring. Users should treat unsolicited recovery offers as high risk.",
            sourceIds: ["zachxbt-tg", "bitquery-eu", "coindesk-eu", "defiant-eu", "cryptotimes-eu"]
          },
          {
            text: "Reading: customer-side compromise of exchange accounts and/or withdrawal allowlists — not an exchange hot-wallet or treasury breach. Bitquery notes Kraken’s main paid 13 of the paid wallets (majority of volume) and that 8 of ZachXBT’s 11 published addresses look like pre-existing victim wallets previously paid by the same exchanges.",
            sourceIds: ["bitquery-eu", "zachxbt-tg", "coindesk-eu"]
          },
          {
            text: "ZachXBT stated high confidence the actor is not Lazarus Group (judgment; public indicators not detailed). Intrusion method (phishing, malware, insider, SIM/social, allowlist rewrite, etc.) remains undisclosed; chain data alone cannot decide.",
            sourceIds: ["zachxbt-tg", "bitquery-eu", "defiant-eu", "unchained-eu"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "1 Nov 2026 ~12:25 UTC (~20:25 HKT): first large OKX withdrawal in the Bitquery-traced window.",
            sourceIds: ["bitquery-eu"]
          },
          {
            text: "1 Nov 2026 ~13:09 UTC (~21:09 HKT): Kraken withdrawals begin (~44 minutes after OKX).",
            sourceIds: ["bitquery-eu"]
          },
          {
            text: "1 Nov evening UTC through ~15:00: withdrawals build; peak evening window across the three exchanges.",
            sourceIds: ["bitquery-eu"]
          },
          {
            text: "1 Nov 2026 ~23:00 UTC (~07:00 HKT 2 Nov): prior 3 hours moved ~$73.2M (~⅔ of traced total); by ~23:10 UTC ~98% of traced withdrawals already out.",
            sourceIds: ["bitquery-eu"]
          },
          {
            text: "1 Nov 23:44 UTC – 2 Nov 04:02 UTC: UniswapX sold $62.98M stables → 27,553 ETH (~4 hours).",
            sourceIds: ["bitquery-eu"]
          },
          {
            text: "2 Nov morning UTC to ~09:09: final exchange payouts in the Bitquery window.",
            sourceIds: ["bitquery-eu"]
          },
          {
            text: "2 Nov 2026: ZachXBT Telegram @investigations #372 flags suspected >$106M loss; lists 11 Ethereum addresses; excludes Lazarus.",
            sourceIds: ["zachxbt-tg", "cryptotimes-eu", "coindesk-eu"]
          },
          {
            text: "2 Nov 2026 ~12:34–12:49 UTC (~20:34–20:49 HKT): public press restatements (TechFlow and others).",
            sourceIds: ["techflow-eu", "coindesk-eu", "defiant-eu", "theblock-x-eu"]
          },
          {
            text: "2 Nov 2026 13:47 UTC (~21:47 HKT): Bitquery snapshot — ~$78.27M still on Ethereum in thief-tied addresses; ~$3.74M USDC freezable surface.",
            sourceIds: ["bitquery-eu"]
          },
          {
            text: "Through 3 Nov ~11:30 HKT Eng pass: no public victim or named-exchange confirmation found.",
            sourceIds: ["bitquery-eu", "coindesk-eu", "defiant-eu"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "No public confirmation from the unnamed European entity or from Kraken, Crypto.com, or OKX was found this Eng pass — treat victim identity and official loss acknowledgment as open.",
            sourceIds: ["coindesk-eu", "defiant-eu", "bitquery-eu", "zachxbt-tg"]
          },
          {
            text: "Bitquery published an independent on-chain pass ($108.80M USDC outflows; UniswapX ETH conversion; residual balances; instant-exchange and bridge paths) that corroborates the dollar-flow scale of ZachXBT’s alert.",
            sourceIds: ["bitquery-eu"]
          },
          {
            text: "Circle freeze of residual thief USDC was not observed by Bitquery’s Monday check; whether KuCoin / Kyrrex / WellWallet / FixedFloat held or returned funds is unconfirmed publicly.",
            sourceIds: ["bitquery-eu", "unchained-eu"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "ZachXBT primary alert (Telegram @investigations #372) is the originating claim: >$106M suspected from an unnamed EU entity’s multi-CEX accounts; 11 addresses published; not Lazarus (judgment).",
            sourceIds: ["zachxbt-tg", "cryptotimes-eu"]
          },
          {
            text: "CoinDesk, The Defiant, TechFlow, Crypto Times, Unchained, The Block, and DegenerateNews restate the alert; Crypto Times carries a transcription of the published address list.",
            sourceIds: ["coindesk-eu", "defiant-eu", "techflow-eu", "cryptotimes-eu", "unchained-eu", "theblock-x-eu", "degennews-x-eu"]
          },
          {
            text: "TRM / Specter flow graph was cited alongside the ZachXBT alert in press coverage (instant-exchange / Kyrrex / Wagyu paths); treat graph labels as investigator tooling, not exchange confirmation.",
            sourceIds: ["zachxbt-tg", "unchained-eu", "defiant-eu", "bitquery-eu"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "Status ACTIVE — not CONTAINED and not RESOLVED: majority of traced value remains liquid (ETH / residual stables) or privacy-routed (Monero / bridges); no public freeze or recovery package for the victim; no victim or exchange confirmation; intrusion method undisclosed.",
            sourceIds: ["bitquery-eu", "zachxbt-tg", "coindesk-eu", "unchained-eu"]
          },
          {
            text: "Keep ACTIVE until (a) victim or named-exchange public confirmation with scope, (b) material freezes/returns covering residual value, (c) attribution beyond “not Lazarus,” or (d) a closed recovery / law-enforcement outcome. Treat unsolicited recovery offers as high risk.",
            sourceIds: ["zachxbt-tg", "bitquery-eu", "coindesk-eu", "defiant-eu"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "ZachXBT’s primary claim is >$106M suspected loss. Bitquery independently traced $108.80M USDC leaving Kraken, Crypto.com, and OKX for 15 wallets over ~21 hours (1–2 Nov). Ethereum CEX mains in that pass show USDC as the withdrawal asset; USDT appears later via swaps.",
            sourceIds: ["zachxbt-tg", "bitquery-eu", "coindesk-eu"]
          },
          {
            text: "Laundering path (ZachXBT + Bitquery + TRM/Specter labels): exchange withdrawals → intermediary wallets → instant exchange / Kyrrex-tagged clusters → ETH concentration (~27k ETH class via UniswapX) → Wagyu / LI.FI Monero branch + multi-chain bridges. Monero and ETH are not issuer-freezable; residual USDC is the main Circle-freeze surface.",
            sourceIds: ["bitquery-eu", "zachxbt-tg", "unchained-eu"]
          }
        ],
        figures: [
          {
            label: "Suspected loss (ZachXBT)",
            amount: ">$106M",
            confidence: "estimate",
            sourceIds: ["zachxbt-tg", "coindesk-eu", "defiant-eu"]
          },
          {
            label: "Traced USDC outflows (Bitquery)",
            amount: "$108.80M USDC (Kraken / Crypto.com / OKX → 15 wallets)",
            confidence: "confirmed",
            sourceIds: ["bitquery-eu"]
          },
          {
            label: "UniswapX stables → ETH",
            amount: "$62.98M → 27,553 ETH (~4 hours)",
            confidence: "confirmed",
            sourceIds: ["bitquery-eu"]
          },
          {
            label: "Still on Ethereum (13:47 UTC 2 Nov)",
            amount: "~$78.27M (mostly ETH); ~$3.74M USDC freezable",
            confidence: "estimate",
            sourceIds: ["bitquery-eu"]
          },
          {
            label: "Instant / OTC-like exits (Bitquery + labels)",
            amount: "Kyrrex-tagged KuCoin pool ~$8.12M; WellWallet ~$250k; FixedFloat ~$1.32M; unlabelled OTC-like ~$12.91M",
            confidence: "estimate",
            sourceIds: ["bitquery-eu"]
          },
          {
            label: "Monero path (Wagyu / LI.FI)",
            amount: "2,642,400 USDC + 355.53 ETH via one-time order wallets (XMR side opaque)",
            confidence: "estimate",
            sourceIds: ["bitquery-eu", "unchained-eu"]
          },
          {
            label: "Bridges / routers (net)",
            amount: "~$7.10M via six bridges/routers (incl. LI.FI)",
            confidence: "confirmed",
            sourceIds: ["bitquery-eu"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Primary traced path is Ethereum USDC withdrawals from Kraken, Crypto.com, and OKX, with aggressive conversion to ETH via UniswapX and exits via instant-exchange services, bridges, and a Monero branch. Do not describe this as an exchange treasury or hot-wallet compromise.",
            sourceIds: ["bitquery-eu", "zachxbt-tg", "coindesk-eu"]
          },
          {
            text: "ZachXBT published 11 Ethereum addresses (Crypto Times transcription): 0xADd95cD98E0288ba69785E3151E1db86adF8Dd58, 0x29e9D7715D935e0D0D4B0DD0efC952A97E551020, 0x378B4f150707C283574DC89739608D29036D57d5, 0x795a9d22F233024487161Fe6daFf73397c162621, 0x730Bcb1296758c377149d7409f98f041cf723992, 0x12D9012731eb0D54871A31Af5566Eb9ECCa351Db, 0x5A154f77852ed274Fd6F4c324a1Ee27809052FF7, 0xA1096A66f9ed58A9594A6A1ad67A5472C0907224, 0x90F0b6D51ed2FE2348A45b2C49BC441E959bc557, 0x8A97BC406180e28b11C5495fA099BF5119c6C6B0, 0xd010cba790a6ab0048da18f2fbe8e3faf463a16a. Bitquery notes 8 of 11 look pre-existing; 3 were new on 1 Nov; four additional paid wallets (+$28.00M) were missing from the public 11.",
            sourceIds: ["cryptotimes-eu", "zachxbt-tg", "bitquery-eu"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Labels: unnamed EU entity · multi-CEX account withdrawals · >$106M suspected · $108.80M USDC traced · Kraken / Crypto.com / OKX · UniswapX → ~27.5k ETH · WellWallet / Kyrrex / FixedFloat · Wagyu Monero path · 11 published addresses · customer-side compromise framing · not Lazarus (ZachXBT judgment) · victim and exchanges unconfirmed · ACTIVE.",
            sourceIds: ["zachxbt-tg", "bitquery-eu", "coindesk-eu", "cryptotimes-eu", "unchained-eu"]
          },
          {
            text: "Near-term user risk: phishing and fake recovery solicitations while residual ETH/Monero paths remain fluid and the victim stays unnamed. Do not invent a victim legal name. Watch for Circle freezes on residual USDC, exchange holds on instant-swap credits, and any LE / compliance announcements.",
            sourceIds: ["zachxbt-tg", "bitquery-eu", "coindesk-eu", "defiant-eu"]
          }
        ]
      }
    ]
  },
  {
    id: "talis-protocol-injective-nft-exploit-2026-10-31",
    title: "Talis Protocol — Injective NFT marketplace / auction exploit (~5,700 NFTs)",
    occurredAt: "2026-10-31T22:50:05.000Z",
    status: "CONTAINED",
    amountSummary:
      "~5,700 escrowed NFTs taken and sold into open collection offers; >26,000 NFTs returned from contracts; USD undisclosed",
    chains: ["Injective", "Multi-chain Talis (paused as precaution)"],
    background: {
      protocolType: "NFT marketplace",
      notes: [
        {
          text: "Talis Protocol operates NFT marketplace and auction contracts on Injective (other Talis chains paused as a precaution in this incident).",
          sourceIds: ["talis-x-1", "talis-x-3"]
        }
      ]
    },
    sources: [
      {
        id: "talis-x-1",
        title: "Talis Protocol (@ProtocolTalis) 1/ — official ACK: bug in marketplace + auction contracts on Injective; ~5,700 escrowed NFTs taken",
        url: "https://x.com/ProtocolTalis/status/2116664033457680705"
      },
      {
        id: "talis-x-2",
        title: "Talis 2/ — halted Injective listings/auctions; returned >26,000 NFTs from contracts to owners",
        url: "https://x.com/ProtocolTalis/status/2116664036138025405"
      },
      {
        id: "talis-x-3",
        title: "Talis 3/ — other-chain listings/auctions paused; don't buy/list/bid until safe; open offers cancellable",
        url: "https://x.com/ProtocolTalis/status/2116664039107637467"
      },
      {
        id: "talis-x-4",
        title: "Talis 4/ — patched contracts ready; pre-deployment review; timeline TBD",
        url: "https://x.com/ProtocolTalis/status/2116664041032626506"
      },
      {
        id: "talis-x-5",
        title: "Talis 5/ — restitution plan: restore NFTs + make offer makers whole; affected list forthcoming",
        url: "https://x.com/ProtocolTalis/status/2116664043566191069"
      },
      {
        id: "talis-x-6",
        title: "Talis 6/ — anti-phishing (never DM / wallet-connect claim); full post-mortem will follow",
        url: "https://x.com/ProtocolTalis/status/2116664045604426067"
      },
      {
        id: "chaincatcher-talis",
        title: "ChainCatcher — press restatement of official ~5,700 NFTs / halt / return counts",
        url: "https://www.chaincatcher.com/en/article/2300764"
      },
      {
        id: "kucoin-talis",
        title: "KuCoin flash — Talis Protocol NFT market on Injective exploited; 5,700 NFTs stolen",
        url: "https://www.kucoin.com/news/flash/talis-protocol-nft-market-on-injective-exploited-5-700-nfts-stolen"
      },
      {
        id: "slowmist-home",
        title: "SlowMist Hacked — no Talis Protocol row listed at time of this report",
        url: "https://hacked.slowmist.io/en/"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "Official @ProtocolTalis: on 31 Oct 2026 an attacker exploited a bug in the Talis marketplace and auction contracts on Injective. About 5,700 escrowed NFTs were taken and sold into open collection offers. Reading: on-chain smart-contract / marketplace-custody incident — not a DNS/frontend StepDrainer wave and not a CEX hot-wallet drain.",
            sourceIds: ["talis-x-1", "chaincatcher-talis", "kucoin-talis"]
          },
          {
            text: "Containment claimed in the same official thread: halted new listings/auctions on Injective; returned more than 26,000 NFTs still in the contracts to owners; paused new listings/auctions on other chains as a precaution; users told not to buy/list/bid until safe (open offers remain cancellable).",
            sourceIds: ["talis-x-2", "talis-x-3"]
          },
          {
            text: "Technical root cause beyond official “a bug” remains open: this report found no SlowMist Talis row, no DefiLlama Talis Protocol hacks entry cited here, and no PeckShield/BlockSec/CertiK exploit write-up cited here. Do not invent method, attacker addresses, or USD.",
            sourceIds: ["talis-x-1", "talis-x-4", "slowmist-home"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "31 Oct 2026 (exact hour undisclosed): official labels the exploit “Earlier today, Oct 31” — ~5,700 escrowed NFTs taken and sold into open collection offers on Injective.",
            sourceIds: ["talis-x-1"]
          },
          {
            text: "22:50:05 UTC 31 Oct (≈06:50 HKT 1 Nov): @ProtocolTalis 1/ disclosure thread starts — marketplace + auction contract bug acknowledgment.",
            sourceIds: ["talis-x-1"]
          },
          {
            text: "22:50:06 UTC: 2/ — Injective listings/auctions halted; >26,000 NFTs returned from contracts (check wallet if listing/auction disappeared).",
            sourceIds: ["talis-x-2"]
          },
          {
            text: "22:50:07 UTC: 3/ — other chains paused as precaution; don’t buy/list/bid until safe; open offers cancellable.",
            sourceIds: ["talis-x-3"]
          },
          {
            text: "22:50:07 UTC: 4/ — patched contracts ready; pre-deployment review; timeline TBD.",
            sourceIds: ["talis-x-4"]
          },
          {
            text: "22:50:08 UTC: 5/ + 6/ — restitution plan (restore NFTs + make offer makers whole; publish affected list); anti-phishing; full post-mortem promised.",
            sourceIds: ["talis-x-5", "talis-x-6"]
          },
          {
            text: "Afternoon re-verify (~22:20 HKT 1 Nov): press flashes restate official counts; SlowMist Hacked still shows no Talis row; no newer @ProtocolTalis post after the thread cited here.",
            sourceIds: ["chaincatcher-talis", "kucoin-talis", "slowmist-home", "talis-x-1"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "Talis Protocol (@ProtocolTalis): primary official acknowledgment + containment + restitution-plan promise + post-mortem commitment across the 6-part thread.",
            sourceIds: ["talis-x-1", "talis-x-2", "talis-x-3", "talis-x-4", "talis-x-5", "talis-x-6"]
          },
          {
            text: "SlowMist Hacked: no Talis Protocol entry found in this report’s sources (do not invent a SlowMist loss row).",
            sourceIds: ["slowmist-home"]
          },
          {
            text: "Injective L1 / unrelated protocols: no @injective official incident post claiming chain-level compromise is cited here — the exploit is framed as Talis Injective contracts.",
            sourceIds: ["talis-x-1", "talis-x-3"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "ChainCatcher restates official counts (~5,700 taken; halt; returns) — cite as secondary press, not an independent loss ledger.",
            sourceIds: ["chaincatcher-talis", "talis-x-1"]
          },
          {
            text: "KuCoin flash restates the same official facts (5,700 NFTs stolen on Injective Talis market) — press amplification.",
            sourceIds: ["kucoin-talis", "talis-x-1"]
          },
          {
            text: "No DefiLlama Talis Protocol hacks row and no SlowMist Talis row cited here — treated as unlisted; do not invent firm method fields.",
            sourceIds: ["slowmist-home", "talis-x-1"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "Status CONTAINED — not RESOLVED: official claims exploit path stopped via Injective halt + escrow return + other-chain pause, but patched contracts remain in pre-deploy review only, restitution plan unpublished, affected-NFT list pending, and post-mortem pending.",
            sourceIds: ["talis-x-2", "talis-x-3", "talis-x-4", "talis-x-5", "talis-x-6"]
          },
          {
            text: "Residual risk remains until a live patch is confirmed, restitution is executed, and a method post-mortem lands — do not flip to RESOLVED on pause alone.",
            sourceIds: ["talis-x-4", "talis-x-5", "talis-x-6"]
          },
          {
            text: "Stolen ~5,700 NFT ownership remains open; offer makers are impacted with a promised make-whole intent only.",
            sourceIds: ["talis-x-1", "talis-x-5"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "Cite NFT counts from official sources only. ~5,700 taken ≠ >26,000 returned (remaining escrow returned is not the stolen set). USD / INJ cash loss undisclosed — do not invent a dollar figure.",
            sourceIds: ["talis-x-1", "talis-x-2", "chaincatcher-talis", "kucoin-talis", "slowmist-home"]
          }
        ],
        figures: [
          {
            label: "Escrowed NFTs taken + sold into collection offers (official)",
            amount: "~5,700 NFTs",
            confidence: "confirmed",
            sourceIds: ["talis-x-1", "kucoin-talis"]
          },
          {
            label: "NFTs returned from contracts to owners (official)",
            amount: ">26,000 NFTs",
            confidence: "confirmed",
            sourceIds: ["talis-x-2"]
          },
          {
            label: "USD / token cash loss",
            amount: "Not disclosed",
            confidence: "estimate",
            sourceIds: ["talis-x-1", "slowmist-home", "chaincatcher-talis"]
          },
          {
            label: "SlowMist listed loss",
            amount: "n/a (no Talis row this pass)",
            confidence: "estimate",
            sourceIds: ["slowmist-home"]
          },
          {
            label: "Patch / trading restore",
            amount: "Pre-deploy review only; timeline TBD",
            confidence: "confirmed",
            sourceIds: ["talis-x-4"]
          },
          {
            label: "Restitution",
            amount: "Plan promised; not executed as of this report",
            confidence: "estimate",
            sourceIds: ["talis-x-5"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Exploit framed officially as Talis marketplace + auction contracts on Injective. Asset impact cited as escrowed NFTs (no official USDC / INJ cash figure).",
            sourceIds: ["talis-x-1", "talis-x-2"]
          },
          {
            text: "Other Talis chains: new listings / auctions paused as precaution only — official does not claim other-chain contracts were exploited.",
            sourceIds: ["talis-x-3"]
          },
          {
            text: "Product context only: injective.talis.art / talis.art adjacency; do not equate to root cause without confirmation.",
            sourceIds: ["talis-x-1", "chaincatcher-talis"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Summary: Injective NFT marketplace exploit · official @ProtocolTalis acknowledgment · ~5,700 escrowed NFTs · >26,000 NFTs returned · USD undisclosed · patch pre-deploy review · restitution forthcoming · SlowMist/DefiLlama unlisted (this report).",
            sourceIds: ["talis-x-1", "talis-x-2", "talis-x-4", "talis-x-5", "slowmist-home", "kucoin-talis"]
          },
          {
            text: "Affected: owners of ~5,700 stolen escrowed NFTs; offer makers whose collection offers filled; owners of >26k returned escrow; broader Talis users under pause.",
            sourceIds: ["talis-x-1", "talis-x-2", "talis-x-3", "talis-x-5"]
          },
          {
            text: "Users advised: don’t buy / list / bid until team confirms safe; cancel open offers OK; don’t buy affected NFTs once list publishes; never trust DM / wallet-connect claim requests.",
            sourceIds: ["talis-x-3", "talis-x-5", "talis-x-6"]
          }
        ]
      }
    ]
  },
  {
    id: "vergex-account-drain-2026-10-31",
    title: "VergeX — AI trading platform account drain (~$3,688.58 USDC)",
    occurredAt: "2026-10-31T13:56:00.000Z",
    status: "CONTAINED",
    amountSummary:
      "official ~$3,688.58 USDC affected and returned; earlier community max ~850 USDT/user",
    chains: ["Multi-chain (platform accounts)", "USDC"],
    background: {
      protocolType: "AI trading",
      notes: [
        {
          text: "VergeX is an AI trading platform; this report covers an account-drain incident with funds returned and a staged restore.",
          sourceIds: ["vergex-x-ack"]
        }
      ]
    },
    sources: [
      {
        id: "vergex-x-ack",
        title: "VergeX (@vergex_ai) — official incident ACK; 3,688.58 USDC returned; staged restore",
        url: "https://x.com/vergex_ai/status/2116549211110129781"
      },
      {
        id: "tintin-sync",
        title: "Tintin (@Tintinx2021) — Chinese sync of official 3,688.58 USDC + funds returned",
        url: "https://x.com/Tintinx2021/status/2116549547900252399"
      },
      {
        id: "tintin-refund",
        title: "Tintin — reply to Odaily: affected users fully refunded; others unaffected",
        url: "https://x.com/Tintinx2021/status/2116550692194447597"
      },
      {
        id: "odaily-early",
        title: "Odaily — early Tintin community claim (~850 USDT max / 72h); official silent at press",
        url: "https://x.com/OdailyChina/status/2116541915634229416"
      },
      {
        id: "techflow-early",
        title: "TechFlow — community drain window ~21:56 HKT; Tintin few users / ~850 USDT max / 72h",
        url: "https://www.techflowpost.com/en-US/newsletter/142252"
      },
      {
        id: "slowmist-vergex",
        title: "SlowMist Hacked — VergeX $3,688.58; method Unknown; returned / staged restore",
        url: "https://hacked.slowmist.io/en/"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "Users of VergeX (AI trading / agent platform) reported consecutive withdrawal-verification / OTP emails with no user action, then unauthorized transfers out of platform accounts. Reading: account / withdrawal-authorization incident — not a public smart-contract exploit and not a DNS/frontend StepDrainer wave.",
            sourceIds: ["vergex-x-ack", "techflow-early", "odaily-early", "slowmist-vergex"]
          },
          {
            text: "@vergex_ai official: risk controls triggered within one minute; some users received withdrawal verification emails triggered by the attack; total 3,688.58 USDC affected; other users unaffected; all affected funds returned; services restoring in stages; withdrawal reopen schedule TBD via official X + community.",
            sourceIds: ["vergex-x-ack", "tintin-sync", "slowmist-vergex"]
          },
          {
            text: "Attack method remains Unknown (SlowMist + no official technical root-cause). Community speculation that the drain touched VergeX account / withdrawal-auth path vs Trade-only exchange API alone is unconfirmed.",
            sourceIds: ["slowmist-vergex", "vergex-x-ack"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "~13:56 UTC 31 Oct 2026 (≈21:56 HKT): community-reported window — consecutive withdrawal verification emails, then unauthorized transfers (TechFlow / Odaily restating community).",
            sourceIds: ["techflow-early", "odaily-early"]
          },
          {
            text: "~14:39–14:44 UTC (≈22:39–22:44 HKT): Press cites Tintin community claim — few users; max ~850 USDT each; refunds within 72h; @vergex_ai still silent at publish.",
            sourceIds: ["techflow-early", "odaily-early"]
          },
          {
            text: "15:13 UTC (≈23:13 HKT): @vergex_ai official ACK — 3,688.58 USDC affected; funds returned; staged restore; withdrawal reopen TBD.",
            sourceIds: ["vergex-x-ack"]
          },
          {
            text: "15:15 UTC (≈23:15 HKT): Tintin Chinese sync of same official numbers + funds returned.",
            sourceIds: ["tintin-sync"]
          },
          {
            text: "15:19 UTC (≈23:19 HKT): Tintin reply to Odaily — affected users fully refunded; funds back in accounts; others unaffected.",
            sourceIds: ["tintin-refund", "odaily-early"]
          },
          {
            text: "Overnight re-verify (~00:45–01:00 HKT 1 Nov): SlowMist lists VergeX $3,688.58 / method Unknown / returned / staged restore; no official withdrawal-reopen post cited here.",
            sourceIds: ["slowmist-vergex", "vergex-x-ack"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "VergeX (@vergex_ai): official incident ACK; risk controls <1 min; 3,688.58 USDC affected and returned; staged service restore; withdrawal reopen schedule TBD.",
            sourceIds: ["vergex-x-ack"]
          },
          {
            text: "Tintin (@Tintinx2021): early community claim (few users / ~850 USDT max / 72h refund) via press; later X sync matching official USDC total and refund-complete replies.",
            sourceIds: ["odaily-early", "techflow-early", "tintin-sync", "tintin-refund"]
          },
          {
            text: "SlowMist Hacked: lists VergeX 2026-10-31 at $3,688.58 with method Unknown; description mirrors official returned / staged-restore language.",
            sourceIds: ["slowmist-vergex"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "TechFlow (datePublished ~14:39 UTC): community drain window ~21:56 HKT; Tintin claim few users / ~850 USDT max / 72h; official X silent at publish — early estimate vs later official total.",
            sourceIds: ["techflow-early"]
          },
          {
            text: "Odaily X restates the same early Tintin claim (≈22:44 HKT) with screenshots cited in press — community screenshots alone are not a loss ledger.",
            sourceIds: ["odaily-early"]
          },
          {
            text: "SlowMist Hacked restates official $3,688.58 and Unknown method; no DefiLlama VergeX hacks entry cited here.",
            sourceIds: ["slowmist-vergex"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "Status CONTAINED — not RESOLVED: official claims impact stopped and all affected funds returned, but attack method remains open and withdrawals / full service restore remain staged (reopen schedule TBD).",
            sourceIds: ["vergex-x-ack", "slowmist-vergex", "tintin-refund"]
          },
          {
            text: "Residual platform risk remains until root cause, confirmed withdrawal reopen, and post-mortem land — do not flip to RESOLVED on refunds alone.",
            sourceIds: ["vergex-x-ack", "slowmist-vergex"]
          },
          {
            text: "Other users claimed unaffected (official + Tintin).",
            sourceIds: ["vergex-x-ack", "tintin-sync", "tintin-refund"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "Official total 3,688.58 USDC supersedes earlier Tintin-via-press ~850 USDT max / user claim for the aggregate. Do not invent a USDT↔USDC conversion narrative.",
            sourceIds: ["vergex-x-ack", "odaily-early", "techflow-early", "slowmist-vergex"]
          }
        ],
        figures: [
          {
            label: "Official affected total (@vergex_ai)",
            amount: "3,688.58 USDC",
            confidence: "confirmed",
            sourceIds: ["vergex-x-ack", "tintin-sync"]
          },
          {
            label: "SlowMist listed loss",
            amount: "$3,688.58",
            confidence: "estimate",
            sourceIds: ["slowmist-vergex"]
          },
          {
            label: "Early Tintin claim max / user (via TechFlow / Odaily)",
            amount: "~850 USDT (pre-official total)",
            confidence: "estimate",
            sourceIds: ["techflow-early", "odaily-early"]
          },
          {
            label: "Funds returned (official + Tintin)",
            amount: "All affected (official claim)",
            confidence: "confirmed",
            sourceIds: ["vergex-x-ack", "tintin-refund", "tintin-sync"]
          },
          {
            label: "Attack method",
            amount: "Unknown",
            confidence: "estimate",
            sourceIds: ["slowmist-vergex", "vergex-x-ack"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Asset cited officially as USDC (3,688.58). Early press used USDT for the per-user max — unit difference only; aggregate cites official USDC.",
            sourceIds: ["vergex-x-ack", "techflow-early", "odaily-early"]
          },
          {
            text: "Account / withdrawal-authorization path on VergeX platform accounts — no official claim of on-chain protocol / Hyperliquid exploit cited here.",
            sourceIds: ["vergex-x-ack", "slowmist-vergex", "techflow-early"]
          },
          {
            text: "Product context only: vergex.trade risk disclosure positions non-custodial exchange/API trading — adjacency; do not equate to root cause without confirmation.",
            sourceIds: ["vergex-x-ack"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Summary: AI trading platform account drain · official @vergex_ai acknowledgment · SlowMist listed · ~$3,688.58 USDC · funds returned (official) · attack method unknown · withdrawals staged restore · Tintin community then official.",
            sourceIds: ["vergex-x-ack", "slowmist-vergex", "techflow-early", "odaily-early", "tintin-refund"]
          },
          {
            text: "Affected scope claimed as a few / some users; others claimed unaffected. Exact user count and any residual disputes remain open.",
            sourceIds: ["vergex-x-ack", "techflow-early", "tintin-refund"]
          },
          {
            text: "Users advised by official to log in and check balances; withdrawal reopen TBD via official X + community — residual until reopen confirmed.",
            sourceIds: ["vergex-x-ack", "tintin-sync"]
          }
        ]
      }
    ]
  },
  {
    id: "flap-kintsu-stonkbrokers-dns-frontend-2026-10-31",
    title: "Flap / Kintsu / StepDrainer — DNS + frontend wave",
    occurredAt: "2026-10-31T00:35:00.000Z",
    status: "ACTIVE",
    amountSummary:
      "Loss size unconfirmed; no official total (ACTIVE DNS / multi-dApp wave)",
    chains: ["BNB Chain", "Monad", "Multi-chain (frontend)"],
    background: {
      protocolType: "other",
      notes: [
        {
          text: "Multi-dApp DNS and frontend compromise wave affecting Flap, Kintsu, Longbow and related domains; Blockaid described a StepDrainer expansion.",
          sourceIds: ["flap-hijack", "blockaid-expand"]
        }
      ]
    },
    sources: [
      {
        id: "flap-hijack",
        title: "Flap (@flapdotsh) — flap.sh DNS hijack ACK; do not visit/connect/sign",
        url: "https://x.com/flapdotsh/status/2116352828734050339"
      },
      {
        id: "flap-migrate",
        title: "Flap (@flapdotsh) — migrate to flap.cool; root cause still investigating",
        url: "https://x.com/flapdotsh/status/2116400269445509360"
      },
      {
        id: "flap-restore",
        title: "Flap (@flapdotsh) — flap.sh + flap.cool both OK to use",
        url: "https://x.com/flapdotsh/status/2116433470276972590"
      },
      {
        id: "tokenpost-flap",
        title: "TokenPost — Flap restores flap.sh; flap.cool remains backup",
        url: "https://www.tokenpost.com/news/technology/45378"
      },
      {
        id: "kintsu-hijack",
        title: "Kintsu — registrar DNS hijack; revoke if connected/signed since ~00:00 UTC",
        url: "https://x.com/Kintsu/status/2116373486234902587"
      },
      {
        id: "kintsu-vercel",
        title: "Kintsu — Vercel Domains registrar-level hijack; wallet drainer / supply-chain framing",
        url: "https://x.com/Kintsu/status/2116382643017101513"
      },
      {
        id: "kintsu-restore-1",
        title: "Kintsu — restored to infra; avoid until all-clear; DNS cache window",
        url: "https://x.com/Kintsu/status/2116383575159312695"
      },
      {
        id: "kintsu-restore-2",
        title: "Kintsu — serving real site; stay cautious; working with registrar (no all-clear)",
        url: "https://x.com/Kintsu/status/2116401713930289391"
      },
      {
        id: "longbow-restore",
        title: "Longbow (@longbowlend) — Vercel Domains vector; restored; contracts/vaults unaffected",
        url: "https://x.com/longbowlend/status/2116398695612555659"
      },
      {
        id: "blockaid-trio",
        title: "Blockaid — frontend attack alert: flap.sh / kintsu.xyz / stonkbrokers.cash",
        url: "https://x.com/blockaid_/status/2116354922128015441"
      },
      {
        id: "blockaid-narrow",
        title: "Blockaid edit — alert narrowed to Flap + Kintsu (StonkBrokers dropped)",
        url: "https://x.com/blockaid_/status/2116363035598266514"
      },
      {
        id: "blockaid-expand",
        title: "Blockaid — Step Drainer expansion (10 additional domains actively serving)",
        url: "https://x.com/blockaid_/status/2116368762488107157"
      },
      {
        id: "crypto-news",
        title: "crypto.news — DeFi DNS attack / Step Drainer; StonkBrokers contested vs Blockaid edit",
        url: "https://crypto.news/defi-dns-attack-12-sites-step-drainer/"
      },
      {
        id: "kucoin-flap",
        title: "KuCoin — Flap DNS hijack flash; Liquidated collector + attacker IP press claims",
        url: "https://www.kucoin.com/news/flash/flap-official-website-hit-by-dns-hijacking-team-warns-users-not-to-access"
      },
      {
        id: "eth-cedric",
        title: "Flap founder (@eth_cedric) — domain hijack; working with Blockaid / Vercel / Name.com",
        url: "https://x.com/eth_cedric/status/2116386593082642873"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "Attackers compromised domain / registrar control so official hostnames served unauthorized phishing / clone frontends. Reading: DNS + frontend / registrar wave — not a confirmed smart-contract or vault drain.",
            sourceIds: ["flap-hijack", "kintsu-hijack", "kintsu-vercel", "blockaid-trio", "longbow-restore"]
          },
          {
            text: "Flap (@flapdotsh) confirmed flap.sh DNS hijack redirecting to an unauthorized site and told users not to visit, connect wallets, or sign until further notice.",
            sourceIds: ["flap-hijack", "kucoin-flap"]
          },
          {
            text: "Kintsu confirmed a DNS hijack at its registrar (Vercel Domains) serving a wallet drainer; framed as a possible supply-chain attack outside project control; users who connected/signed since ~00:00 UTC 31 Oct told to revoke at Revoke.cash and move funds.",
            sourceIds: ["kintsu-hijack", "kintsu-vercel"]
          },
          {
            text: "Blockaid flagged a potential frontend attack on flap.sh / kintsu.xyz / stonkbrokers.cash, later edited the public alert to Flap + Kintsu only, then expanded to ten more domains actively serving Step Drainer.",
            sourceIds: ["blockaid-trio", "blockaid-narrow", "blockaid-expand", "crypto-news"]
          },
          {
            text: "Longbow confirmed the same Vercel Domains registrar vector hit Longbow alongside Kintsu and other DeFi protocols; Longbow said app, contracts, and vaults were not breached.",
            sourceIds: ["longbow-restore"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "~00:35 UTC 31 Oct 2026 (≈08:35 HKT): researcher-reported window for flap.sh NS / SOA cutover (not Flap official).",
            sourceIds: ["kucoin-flap", "crypto-news"]
          },
          {
            text: "02:13 UTC (≈10:13 HKT): @flapdotsh official DNS-hijack ACK — do not visit / connect / sign.",
            sourceIds: ["flap-hijack"]
          },
          {
            text: "02:21 UTC (≈10:21 HKT): @blockaid_ community alert naming flap.sh, kintsu.xyz, stonkbrokers.cash.",
            sourceIds: ["blockaid-trio"]
          },
          {
            text: "02:54 UTC (≈10:54 HKT): Blockaid edit / follow-up alert narrows to Flap + Kintsu (StonkBrokers dropped from the public list).",
            sourceIds: ["blockaid-narrow", "crypto-news"]
          },
          {
            text: "03:16 UTC (≈11:16 HKT): Blockaid expansion — ten additional domains actively serving Step Drainer (stonkfun, pickle, echelon, origami, fluxbeam, stakepoint, supswap, longbow, shprd, apexdefi).",
            sourceIds: ["blockaid-expand", "crypto-news"]
          },
          {
            text: "03:35 UTC (≈11:35 HKT): @Kintsu official registrar hijack + revoke/move-funds guidance.",
            sourceIds: ["kintsu-hijack"]
          },
          {
            text: "04:11–04:15 UTC (≈12:11–12:15 HKT): Kintsu cites Vercel Domains vector; then says domain restored to own infra — still no all-clear; DNS cache window up to ~1h.",
            sourceIds: ["kintsu-vercel", "kintsu-restore-1"]
          },
          {
            text: "05:15 UTC (≈13:15 HKT): @longbowlend confirms restore + same Vercel Domains wave; wait for all-clear.",
            sourceIds: ["longbow-restore"]
          },
          {
            text: "05:21 UTC (≈13:21 HKT): Flap migrates users to flap.cool; root cause / domain-provider link still under investigation; avoid flap.sh wallet connect at that time.",
            sourceIds: ["flap-migrate"]
          },
          {
            text: "05:27 UTC (≈13:27 HKT): Kintsu update — real site serving again; stay cautious; working with registrar (still no all-clear).",
            sourceIds: ["kintsu-restore-2"]
          },
          {
            text: "07:33 UTC (≈15:34 HKT): Flap restore — flap.sh back online; flap.cool remains; both domains OK to use; continue monitoring.",
            sourceIds: ["flap-restore", "tokenpost-flap"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "Flap: acknowledgment → migrate to flap.cool → later declare both flap.sh and flap.cool OK to use; root cause still investigating at migrate time.",
            sourceIds: ["flap-hijack", "flap-migrate", "flap-restore", "tokenpost-flap"]
          },
          {
            text: "Kintsu: registrar hijack acknowledgment; revoke guidance; Vercel Domains escalation; remitted to own infra — explicitly stay-cautious / no public all-clear in cited posts.",
            sourceIds: ["kintsu-hijack", "kintsu-vercel", "kintsu-restore-1", "kintsu-restore-2"]
          },
          {
            text: "Longbow: confirms Vercel Domains registrar hijack same wave; restore; asks users wait for all-clear (cache window); says on-chain vaults unaffected.",
            sourceIds: ["longbow-restore"]
          },
          {
            text: "Blockaid: initial multi-dApp alert → narrow → Step Drainer expansion list; says investigation continuing; no public aggregate loss.",
            sourceIds: ["blockaid-trio", "blockaid-narrow", "blockaid-expand", "crypto-news"]
          },
          {
            text: "Flap founder (@eth_cedric): identifies domain hijack; working with Blockaid; reaching out to Vercel and Name.com; notes other protocols may be affected.",
            sourceIds: ["eth-cedric"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "Blockaid named Step Drainer on the expanded domain set; crypto.news restates the 12-site count (Flap + Kintsu + 10) and notes circulating screenshots differed on StonkBrokers.",
            sourceIds: ["blockaid-expand", "crypto-news"]
          },
          {
            text: "KuCoin flash restates Flap official acknowledgment and researcher claims (Liquidated-cited collector address claiming BNB theft via forged wallet page; attacker IP 31.56.52.52 from KOL press).",
            sourceIds: ["kucoin-flap"]
          },
          {
            text: "TokenPost covers Flap restore of flap.sh with flap.cool kept as backup.",
            sourceIds: ["tokenpost-flap"]
          },
          {
            text: "StonkBrokers status contested: appeared in Blockaid initial alert and some circulating screenshots, then dropped from Blockaid public edit — no @ClutchMarkets official incident acknowledgment cited here.",
            sourceIds: ["blockaid-trio", "blockaid-narrow", "crypto-news"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "Wave status ACTIVE: multi-dApp DNS / frontend wave remains open even though Flap declares both domains OK to use.",
            sourceIds: ["flap-restore", "blockaid-expand", "kintsu-restore-2", "longbow-restore"]
          },
          {
            text: "Flap chip: remitted / OK-to-use (flap.sh + flap.cool) per official restore; root cause still open from migrate-post context.",
            sourceIds: ["flap-restore", "flap-migrate", "tokenpost-flap"]
          },
          {
            text: "Kintsu chip: remitted to own infra but no all-clear in cited updates (stay cautious / working with registrar).",
            sourceIds: ["kintsu-restore-1", "kintsu-restore-2"]
          },
          {
            text: "Longbow chip: remitted / await all-clear per official post (cache-window guidance).",
            sourceIds: ["longbow-restore"]
          },
          {
            text: "Residual risk on Blockaid expanded domains listed as actively serving Step Drainer at alert time (pickle / fluxbeam / shprd / apexdefi among others) until project all-clears land — do not flip wave to RESOLVED on Flap alone.",
            sourceIds: ["blockaid-expand", "crypto-news"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "No official Flap / Kintsu / Blockaid aggregate USD stolen total found in cited sources. Treat researcher collector claims separately from confirmed protocol loss.",
            sourceIds: ["blockaid-expand", "crypto-news", "kucoin-flap", "flap-hijack", "kintsu-hijack"]
          }
        ],
        figures: [
          {
            label: "Official Flap / Kintsu / Longbow stolen total",
            amount: "Not disclosed",
            confidence: "estimate",
            sourceIds: ["flap-hijack", "kintsu-hijack", "longbow-restore", "crypto-news"]
          },
          {
            label: "Blockaid public aggregate loss figure",
            amount: "Not published (investigation continuing)",
            confidence: "estimate",
            sourceIds: ["blockaid-expand", "crypto-news"]
          },
          {
            label: "Researcher collector claim (Liquidated via KuCoin flash)",
            amount: "0x24497068cA4166ca32a04ae530ce00Cf79755bD5 (BNB size unstated)",
            confidence: "estimate",
            sourceIds: ["kucoin-flap"]
          },
          {
            label: "Longbow on-chain funds / vaults",
            amount: "Unaffected (official claim)",
            confidence: "confirmed",
            sourceIds: ["longbow-restore"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Attack path is DNS / frontend / registrar — users who connect or sign on hijacked hostnames risk wallet-drainer / approval flows (Blockaid Step Drainer label).",
            sourceIds: ["blockaid-expand", "kintsu-vercel", "flap-hijack", "crypto-news"]
          },
          {
            text: "Press / researcher cite BNB / BSC for Flap phishing drains (not an official Flap total); Kintsu is described in press as Monad liquid-staking (sMON) context.",
            sourceIds: ["kucoin-flap", "crypto-news"]
          },
          {
            text: "Attacker IP 31.56.52.52 appears in KuCoin / KOL press restating Flap hijack IOCs — treat as researcher / press until independent firm corroborates each claim.",
            sourceIds: ["kucoin-flap"]
          },
          {
            text: "Longbow says app / contracts / vaults were not breached and on-chain funds are unaffected despite the domain hijack.",
            sourceIds: ["longbow-restore"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Summary: active DNS hijack · multi-dApp frontend · Flap + Kintsu official acknowledgment · Blockaid StepDrainer wave · Vercel Domains vector · loss unconfirmed · StonkBrokers contested · residual risk on unrestored domains.",
            sourceIds: ["flap-hijack", "kintsu-hijack", "blockaid-expand", "kintsu-vercel", "blockaid-narrow", "crypto-news"]
          },
          {
            text: "Users who visited unauthorized redirects and connected / signed during the hijack window remain residual risk (Kintsu revoke guidance explicit for the ~00:00 UTC window).",
            sourceIds: ["kintsu-hijack", "kintsu-restore-1", "flap-hijack"]
          },
          {
            text: "StonkBrokers / @ClutchMarkets remain contested without a cited official incident acknowledgment — not treated as confirmed victim-project parity with Flap / Kintsu.",
            sourceIds: ["blockaid-trio", "blockaid-narrow", "crypto-news"]
          }
        ]
      }
    ]
  },

  {
    id: "threshold-tbtc-mint-redeem-pause-cve-2026-98432-2026-10-30",
    title: "Threshold / tBTC — mint+redeem pause (CVE-2026-98432 precaution)",
    occurredAt: "2026-10-30T22:35:51.000Z",
    status: "CONTAINED",
    amountSummary:
      "Bridge BTC claimed intact (~4,320 BTC wallets vs ~4,185 tBTC); no unauthorized mint/BTC move claimed; separate ~0.5 ETH operator fee drain; no SlowMist/DefiLlama row",
    chains: [
      "Bitcoin↔Ethereum tBTC bridge (Threshold)",
      "Operator Linux hosts",
      "Aave V3 Ethereum Core (side freeze)"
    ],
    background: {
      protocolType: "bridge",
      sizeMetrics: [
        {
          label: "Bridge BTC wallets",
          value: "~4,320 BTC",
          asOf: "2026-10-31",
          confidence: "confirmed",
          sourceIds: ["threshold-x-contained"]
        },
        {
          label: "Circulating tBTC",
          value: "~4,185 tBTC",
          asOf: "2026-10-31",
          confidence: "confirmed",
          sourceIds: ["threshold-x-contained"]
        }
      ],
      notes: [
        {
          text: "Threshold Network operates the tBTC Bitcoin↔Ethereum bridge; this report covers a precautionary mint+redeem pause while operators responded to Linux kernel CVE-2026-98432.",
          sourceIds: ["threshold-x-pause", "threshold-x-cve"]
        }
      ]
    },
    sources: [
      {
        id: "threshold-x-pause",
        title: "Threshold (@TheTNetwork) — mint + new BTC redemptions paused as precaution",
        url: "https://x.com/TheTNetwork/status/2116298061626368495"
      },
      {
        id: "threshold-x-contained",
        title: "Threshold (@TheTNetwork) — ~4,320 BTC vs ~4,185 tBTC; “contained”; no unauthorized mint",
        url: "https://x.com/TheTNetwork/status/2116588948881375583"
      },
      {
        id: "threshold-x-cve",
        title: "Threshold (@TheTNetwork) — CVE-2026-98432 named; operators patched/offline; ~0.5 ETH fee drain side",
        url: "https://x.com/TheTNetwork/status/2116965471157203243"
      },
      {
        id: "tbtc-project-echo",
        title: "tBTC (@tBTC_project) — echoes Threshold CVE update",
        url: "https://x.com/tBTC_project/status/2117002540080582776"
      },
      {
        id: "redhat-rhsb",
        title: "Red Hat RHSB-2026-016 — CVE-2026-98432 Linux kernel IPv4 TCP use-after-free",
        url: "https://access.redhat.com/security/vulnerabilities/RHSB-2026-016"
      },
      {
        id: "aave-x-freeze",
        title: "Aave (@aave) — freezes tBTC on V3 Ethereum Core",
        url: "https://x.com/aave/status/2116479695424192605"
      },
      {
        id: "llamarisk-forum",
        title: "LlamaRisk Aave forum — tBTC mint & redeem pause / Aave response",
        url: "https://governance.aave.com/t/tbtc-mint-redeem-pause-aaves-response/25965"
      },
      {
        id: "defiant-threshold",
        title: "The Defiant — Threshold says tBTC operators patched or went offline over Linux flaw",
        url: "https://thedefiant.io/news/security/threshold-says-tbtc-operators-patched-or-went-offline-over-linux-flaw"
      },
      {
        id: "slowmist-home",
        title: "SlowMist Hacked — no Threshold / tBTC row this Eng pass",
        url: "https://hacked.slowmist.io/en/"
      }
    ],
    sections: [
      {
        id: "what",
        title: "What happened / how",
        claims: [
          {
            text: "Official @TheTNetwork: starting 30 Oct 2026 22:35 UTC, new tBTC minting and new Bitcoin redemption requests through the Threshold app were paused — first as unnamed “security maintenance,” then (1 Nov UTC) as a precaution against Linux kernel CVE-2026-98432. Holding and transferring tBTC on Ethereum / L2s is claimed unaffected.",
            sourceIds: ["threshold-x-pause", "threshold-x-cve", "defiant-threshold"]
          },
          {
            text: "Official claims every tBTC node operator is patched or offline, there is no evidence the CVE was exploited against any tBTC node, no unauthorized minting or BTC movement, and full backing (~4,320 BTC in bridge wallets vs ~4,185 tBTC circulating). Separately, one operator reported ~0.5 ETH drained from its Ethereum fee-paying account (not bridge BTC signing keys); that node was already offline.",
            sourceIds: ["threshold-x-contained", "threshold-x-cve"]
          },
          {
            text: "This is a precautionary bridge operational pause + operator-infra CVE response, not a proven on-chain tBTC smart-contract exploit and not a confirmed bridge BTC theft. CVE-2026-98432 is a Linux kernel IPv4 TCP use-after-free / remote code-execution class flaw (Red Hat Critical). Aave froze tBTC on V3 Ethereum Core as a proactive DeFi-market step.",
            sourceIds: ["threshold-x-cve", "redhat-rhsb", "aave-x-freeze", "llamarisk-forum"]
          }
        ]
      },
      {
        id: "timeline",
        title: "Timeline",
        claims: [],
        bullets: [
          {
            text: "~30 Oct 2026: Red Hat RHSB-2026-016 public date for CVE-2026-98432 (Critical IPv4 TCP use-after-free / RCE class).",
            sourceIds: ["redhat-rhsb"]
          },
          {
            text: "30 Oct 2026 22:35:51 UTC (~06:35 HKT 31 Oct): @TheTNetwork pauses mint + new BTC redemptions; hold/transfer OK; CVE not yet named.",
            sourceIds: ["threshold-x-pause"]
          },
          {
            text: "31 Oct 2026 ~10:01 UTC: Aave guardian freezes tBTC on V3 Ethereum Core (LlamaRisk recommendation); @aave public note ~10:37 UTC.",
            sourceIds: ["aave-x-freeze", "llamarisk-forum"]
          },
          {
            text: "31 Oct 2026 17:51:44 UTC (~01:51 HKT 1 Nov): @TheTNetwork mid-update — ~4,320 BTC vs ~4,185 tBTC; “contained”; no unauthorized mint; resume after full remediation.",
            sourceIds: ["threshold-x-contained"]
          },
          {
            text: "1 Nov 2026 18:47:54 UTC (~02:47 HKT 2 Nov): @TheTNetwork names CVE-2026-98432; all operators patched or offline; no tBTC-node exploit evidence; ~0.5 ETH fee-account side drain; majority signing required; next update promised within 24h.",
            sourceIds: ["threshold-x-cve"]
          },
          {
            text: "1 Nov 2026 ~21:15 UTC: @tBTC_project echoes the CVE update. Through this Eng pass: no resume post; SlowMist/DefiLlama still unlisted.",
            sourceIds: ["tbtc-project-echo", "slowmist-home", "threshold-x-cve"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "Threshold Network (@TheTNetwork): primary official ACK across pause, backing/“contained,” and CVE-named updates; bridge resume gated on maintenance complete and patched nodes online.",
            sourceIds: ["threshold-x-pause", "threshold-x-contained", "threshold-x-cve"]
          },
          {
            text: "Aave / LlamaRisk: proactive freeze of tBTC on V3 Ethereum Core — blocks new deposits and new borrow power; repay/withdraw/liquidations continue.",
            sourceIds: ["aave-x-freeze", "llamarisk-forum"]
          },
          {
            text: "SlowMist Hacked: no Threshold / tBTC entry found this Eng pass — do not invent a SlowMist loss row.",
            sourceIds: ["slowmist-home"]
          }
        ]
      },
      {
        id: "news",
        title: "News / security firms",
        claims: [
          {
            text: "The Defiant restates the CVE precaution, operator patch/offline claim, and independently checks explorer wallet BTC (~4,320.33) versus circulating tBTC — secondary support for the official backing claim.",
            sourceIds: ["defiant-threshold", "threshold-x-contained"]
          },
          {
            text: "Red Hat RHSB-2026-016 is the primary CVE vendor bulletin for CVE-2026-98432. This Eng pass found no SlowMist or DefiLlama Threshold/tBTC hack row.",
            sourceIds: ["redhat-rhsb", "slowmist-home"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "Status CONTAINED — not RESOLVED: official frames a precautionary pause with claimed intact backing and no evidenced tBTC-node exploit, but mint+redeem remain paused, bridge has not resumed, Aave Ethereum Core freeze is still on, and the promised post-CVE update window was still open at brief compile.",
            sourceIds: ["threshold-x-contained", "threshold-x-cve", "aave-x-freeze"]
          },
          {
            text: "Not ACTIVE: no evidence this pass of an ongoing bridge BTC drain, unauthorized mint, or active CVE exploitation of tBTC nodes; transfers are claimed still working.",
            sourceIds: ["threshold-x-pause", "threshold-x-cve"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "Official claims ~4,320 BTC in bridge wallets versus ~4,185 tBTC circulating, with no unauthorized mint or BTC movement. Bridge BTC USD hack loss is not claimed. Only disclosed cash loss in the CVE update is the separate ~0.5 ETH operator fee-account drain.",
            sourceIds: ["threshold-x-contained", "threshold-x-cve", "defiant-threshold", "slowmist-home"]
          }
        ],
        figures: [
          {
            label: "Bridge BTC claimed in wallets (official)",
            amount: "~4,320 BTC (Defiant independent check ~4,320.33)",
            confidence: "confirmed",
            sourceIds: ["threshold-x-contained", "defiant-threshold"]
          },
          {
            label: "Circulating tBTC (official)",
            amount: "~4,185 tBTC",
            confidence: "confirmed",
            sourceIds: ["threshold-x-contained"]
          },
          {
            label: "Unauthorized mint / BTC move",
            amount: "None claimed",
            confidence: "confirmed",
            sourceIds: ["threshold-x-contained", "threshold-x-cve"]
          },
          {
            label: "Bridge BTC USD hack loss",
            amount: "$0 claimed (no SlowMist/DefiLlama row)",
            confidence: "estimate",
            sourceIds: ["threshold-x-cve", "slowmist-home"]
          },
          {
            label: "Operator fee-account side loss",
            amount: "~0.5 ETH",
            confidence: "confirmed",
            sourceIds: ["threshold-x-cve"]
          },
          {
            label: "Mint/redeem availability",
            amount: "Paused (still, this pass)",
            confidence: "confirmed",
            sourceIds: ["threshold-x-pause", "threshold-x-cve"]
          }
        ]
      },
      {
        id: "chains",
        title: "Chains / assets",
        claims: [
          {
            text: "Surface is the Bitcoin↔Ethereum tBTC bridge operated by Threshold, plus operator Linux hosts exposed to CVE-2026-98432. Official mechanism is precautionary / infrastructure — not a proven tBTC protocol bug.",
            sourceIds: ["threshold-x-cve", "redhat-rhsb"]
          },
          {
            text: "Aave V3 Ethereum Core tBTC reserve was frozen as a secondary DeFi response. Official signing model: majority of independent operators required to move bridge BTC.",
            sourceIds: ["aave-x-freeze", "llamarisk-forum", "threshold-x-cve"]
          }
        ]
      },
      {
        id: "people",
        title: "People / market reaction",
        claims: [
          {
            text: "Labels: Threshold Network / tBTC · mint + redeem pause · CVE-2026-98432 Linux kernel precaution · operators patched or offline · no tBTC-node exploit evidence claimed · ~4,320 BTC vs ~4,185 tBTC backed · hold/transfer OK · Aave Ethereum Core freeze side · ~0.5 ETH operator fee drain side · SlowMist/DefiLlama unlisted (this pass).",
            sourceIds: ["threshold-x-cve", "threshold-x-contained", "aave-x-freeze", "slowmist-home", "defiant-threshold"]
          },
          {
            text: "Users wanting to mint tBTC or open new Bitcoin redemptions are blocked; official warns not to re-send to prior deposit addresses. Holders transferring on Ethereum / L2s are claimed unaffected. Aave Ethereum Core suppliers/borrowers face freeze of new supply and new borrow power.",
            sourceIds: ["threshold-x-pause", "aave-x-freeze", "llamarisk-forum"]
          }
        ]
      }
    ]
  },
  {
    id: "binance-hot-wallet-2026-10-30",
    title: "Binance hot-wallet drain — potential security issue",
    occurredAt: "2026-10-29T20:24:00.000Z",
    status: "ACTIVE",
    amountSummary:
      "Official est. impact ~$6.3B; verified frozen ~$3B (confirmed)",
    chains: ["Ethereum", "Bitcoin", "Tron", "Arbitrum", "Optimism", "Avalanche"],
    background: {
      protocolType: "CEX",
      notes: [
        {
          text: "Binance is a centralized exchange; this report covers a hot-wallet / DevOps incident with official updates on method and loss estimates.",
          sourceIds: ["binance-x-devops"]
        }
      ]
    },
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
        title:
          "Cyberdaily — Official Binance updates (DevOps laptop, ~$6.3B, SAFU+corp)",
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
        title:
          "Cointelegraph — Blockaid early take: signing-infra misuse (pre–official update)",
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
      },
      {
        id: "binance-x-devops",
        title:
          "Binance X — DevOps laptop → service container; no private-key leak; ~$6.3B est.",
        url: "https://x.com/binance/status/2115993361517891592"
      },
      {
        id: "binance-x-freeze",
        title: "Binance X — verified frozen ~$3B",
        url: "https://x.com/binance/status/2115970069696217576"
      },
      {
        id: "binance-x-cover",
        title: "Binance X — cover all losses; deposits/withdrawals suspended",
        url: "https://x.com/binance/status/2115981055043981791"
      },
      {
        id: "binance-x-predict",
        title: "Binance X — PREDICT listing postponed until further notice",
        url: "https://x.com/binance/status/2115997882629435456"
      },
      {
        id: "panews",
        title:
          "PANews — Durable quote of official DevOps / ~$6.3B / SAFU+corp / PoR update",
        url: "https://www.panews.io/articles/01a18aa0-7624-71d3-95c4-901bde2cba87"
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
            text: "Official preliminary cause (estimate until post-mortem): Binance's initial investigation suggests a compromised DevOps engineer laptop allowed an attacker to access a service container and submit unauthorized withdrawal transactions.",
            sourceIds: ["binance-x-devops", "panews", "cyberdaily"]
          },
          {
            text: "Official: Binance said it has found no evidence of any wallet private-key leak; a detailed technical post-mortem is promised once facts are fully verified.",
            sourceIds: ["binance-x-devops", "panews", "cyberdaily"]
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
            text: "Earlier analyst take (pre–official DevOps update): Blockaid's preliminary assessment pointed to compromise or misuse of signing infrastructure (\"key misuse\") rather than extraction of a raw private key — demoted relative to Binance's later official \"no private-key leak\" preliminary.",
            sourceIds: ["cointelegraph-blockaid", "binance-x-devops"]
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
            text: "Deposits and withdrawals temporarily suspended while security checks, freezes, and law-enforcement coordination continued; Binance Alpha trading also reported paused as a precaution (prior press cites).",
            sourceIds: ["bbc", "nbc", "cyberdaily", "aljazeera", "binance-x-cover"]
          },
          {
            text: "Stablecoin issuers and partners announced freezes of linked assets; Binance published verified freeze totals that rose from about $2.54B toward ~$3B in subsequent updates.",
            sourceIds: ["bbc", "cyberdaily", "ap", "aljazeera", "binance-x-freeze"]
          },
          {
            text: "~02:25 UTC 30 Oct 2026 (≈10:25 HKT): Binance posted the official preliminary investigation update — DevOps laptop → service container path, no private-key leak evidence, official estimated impact ~$6.3B, SAFU + company funds cover, updated PoR after remediation.",
            sourceIds: ["binance-x-devops", "panews", "cyberdaily"]
          },
          {
            text: "Same morning: Binance said the Predict (PREDICT) listing is postponed until further notice.",
            sourceIds: ["binance-x-predict"]
          }
        ]
      },
      {
        id: "orgs",
        title: "Organization reactions",
        claims: [
          {
            text: "Binance (official): investigating; user funds safe; will cover all losses via SAFU fund and company funds; deposits/withdrawals suspended; affected address authorisation revoked; law enforcement + blockchain intelligence engaged; full technical post-mortem promised; rely only on official Binance channels.",
            sourceIds: [
              "binance-x-devops",
              "binance-x-cover",
              "panews",
              "cyberdaily",
              "bbc",
              "nbc"
            ]
          },
          {
            text: "Binance: Predict (PREDICT) listing postponed until further notice.",
            sourceIds: ["binance-x-predict"]
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
            text: "Reuters-class / wire and major outlets (BBC, AP, NBC, Al Jazeera, TechCrunch) framed the event as a suspected exchange hack with industry-wide freezes while Binance avoided confirming a final stolen total in early coverage.",
            sourceIds: ["bbc", "ap", "nbc", "aljazeera", "techcrunch"]
          },
          {
            text: "PANews and Cyberdaily carried durable quotes of Binance's later official update (DevOps laptop / service container, no private-key leak evidence, ~$6.3B estimated impact, SAFU + corporate cover, PoR after remediation).",
            sourceIds: ["panews", "cyberdaily", "binance-x-devops"]
          },
          {
            text: "Earlier analyst take: Blockaid published on-chain analysis of the EIP-7702 nonce-bracket delegation against Binance 14 and assessed signing-infrastructure misuse (Cointelegraph interview) — read alongside, not above, Binance's later official preliminary.",
            sourceIds: ["cointelegraph-blockaid", "binance-x-devops"]
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
            text: "BleepingComputer and Bitcoin.com summarized public tracker tallies in the multi-billion range while noting Binance had not confirmed unauthorized theft totals in early coverage — distinct from Binance's later official ~$6.3B estimated impact.",
            sourceIds: ["bleeping", "bitcoincom", "binance-x-devops"]
          }
        ]
      },
      {
        id: "status",
        title: "Status",
        claims: [
          {
            text: "As of 30 Oct 2026 HKT: ACTIVE containment / unresolved — investigation ongoing; deposits and withdrawals still described as suspended; affected address authorisation revoked; no full official post-mortem yet.",
            sourceIds: [
              "binance-x-devops",
              "binance-x-cover",
              "panews",
              "cyberdaily",
              "bbc",
              "nbc"
            ]
          },
          {
            text: "Binance said it will share a detailed technical post-mortem once the investigation is complete and the facts are fully verified; freeze totals may continue to rise as partners trace assets.",
            sourceIds: ["binance-x-devops", "binance-x-freeze", "panews", "cyberdaily"]
          },
          {
            text: "Official preliminary cause is the DevOps laptop → service container path with no evidence of wallet private-key leak; estimate until post-mortem. Earlier Blockaid \"key misuse\" wording is demoted as a pre-update analyst take.",
            sourceIds: ["binance-x-devops", "panews", "cointelegraph-blockaid"]
          }
        ]
      },
      {
        id: "money",
        title: "Money",
        claims: [
          {
            text: "Official estimated impact (~$6.3B, Binance figure; estimate) ≠ verified freeze (~$3B, official confirmed). Issuer/partner freezes remain firmer than public early tracker \"stolen\" tallies.",
            sourceIds: [
              "binance-x-devops",
              "binance-x-freeze",
              "panews",
              "cyberdaily",
              "bbc"
            ]
          },
          {
            text: "Binance will cover all losses through the SAFU fund and company funds; user funds are safe; Binance will publish an updated Proof of Reserves once remediation is complete.",
            sourceIds: ["binance-x-devops", "panews", "cyberdaily", "binance-x-cover"]
          }
        ],
        figures: [
          {
            label: "Binance official estimated total impact (estimate until post-mortem)",
            amount: "~$6.3B (official estimate — distinct from verified freeze)",
            confidence: "estimate",
            sourceIds: ["binance-x-devops", "panews", "cyberdaily"]
          },
          {
            label: "Binance verified funds frozen on-chain (official)",
            amount: "~$3B (earlier reported ladder ~$2.54B → ~$3B)",
            confidence: "confirmed",
            sourceIds: ["binance-x-freeze", "binance-x-devops", "panews", "cyberdaily", "aljazeera"]
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
            label: "Binance cover (SAFU + company funds)",
            amount: "Cover all losses / user funds safe; updated PoR after remediation (official)",
            confidence: "confirmed",
            sourceIds: ["binance-x-devops", "binance-x-cover", "panews", "cyberdaily"]
          },
          {
            label: "Earlier public analyst / tracker stolen tallies (pre–official ~$6.3B)",
            amount: "~$2B–$5.8B+ (range across outlets; estimate / unconfirmed)",
            confidence: "estimate",
            sourceIds: ["techcrunch", "bbc", "bleeping", "bitcoincom", "drk"]
          },
          {
            label: "Glassnode / Chainalysis estimates cited by BBC (early)",
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
    background: {
      protocolType: "other",
      notes: [
        {
          text: "Polymarket is a prediction-market application; this report covers a DebugBear RUM / frontend supply-chain incident on the Polygon surface.",
          sourceIds: ["bleeping-pm"]
        }
      ]
    },
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
          { text: "On-chain/analytics tallies cluster ~$2.5–2.7M; Polymarket has not confirmed a single official loss figure. Reimbursement is a confirmed pledge, not a confirmed completed payout total.", sourceIds: ["bleeping-pm", "theblock-pm", "cnbc-pm"] }
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
    background: {
      protocolType: "lending",
      notes: [
        {
          text: "HiFi Finance is an Ethereum lending / governance protocol; this report covers a governance exploit.",
          sourceIds: ["slowmist-hifi"]
        }
      ]
    },
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
          { text: "~$1M is the repeated collateral-loss estimate (SlowMist / Crypto Guardian / Spreek accounts). 25M is a token mint count, not a $25M USD loss.", sourceIds: ["slowmist-hifi", "dave-hifi", "tokenpost-hifi"] }
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
    background: {
      protocolType: "bridge",
      notes: [
        {
          text: "zkLink Nova is a multi-chain bridge / aggregated L2 surface; this report covers a bridge exploit.",
          sourceIds: ["slowmist-zk"]
        }
      ]
    },
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
          { text: "Firm tallies cluster ~$780K–$786K for the Ethereum drain; USD varies by price oracle/time. Token amounts (22.43 ETH, 245.74 pufETH, etc.) are on-chain confirmed.", sourceIds: ["slowmist-zk", "cryptotimes-zk", "panda-zk"] }
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
    background: {
      protocolType: "lending",
      notes: [
        {
          text: "TranchePool is an Avalanche/Solana lending-style protocol; this report covers an on-chain exploit path.",
          sourceIds: ["panda-tp"]
        }
      ]
    },
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
          { text: "Drained token amount is on-chain exact (1,013,353.61 USDC). USD label ≈ same. Bounty is an offer only.", sourceIds: ["panda-tp", "slowmist-tp"] }
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

/** Soft FAIL guard (non-rendered): every claim/bullet/figure/background cite must cite ≥1 known source id. */
export function collectUnsourcedClaimPaths(incident: Incident): string[] {
  const known = new Set(incident.sources.map((s) => s.id));
  const bad: string[] = [];
  const check = (path: string, ids: string[]) => {
    if (!ids.length || ids.some((id) => !known.has(id))) bad.push(path);
  };
  incident.background?.sizeMetrics?.forEach((m, mi) =>
    check(`background.sizeMetrics[${mi}]`, m.sourceIds)
  );
  incident.background?.notes?.forEach((n, ni) =>
    check(`background.notes[${ni}]`, n.sourceIds)
  );
  incident.sections.forEach((sec, si) => {
    sec.claims.forEach((c, ci) => check(`sections[${si}].claims[${ci}]`, c.sourceIds));
    sec.bullets?.forEach((b, bi) => check(`sections[${si}].bullets[${bi}]`, b.sourceIds));
    sec.figures?.forEach((f, fi) => check(`sections[${si}].figures[${fi}]`, f.sourceIds));
  });
  return bad;
}

/** Soft ACK #289 — forbidden Soft-/ops substrings in user-visible FORENSIC corpus fields. */
export const FORENSIC_OPS_JARGON_PATTERNS: RegExp[] = [
  /\bSoft-/, // Soft-* ops compounds (Soft-label, Soft-read, Soft-nice, …)
  /\bSoft\s+ACK\b/i,
  /\bSoft\s+PASS\b/i,
  /\bSoft\s+Eng\b/i,
  /\bSoft\s+Design\b/i,
  /\bSoft-on-behalf\b/i,
  /\borg\s+ops\b/i,
  /Soft ACK labels:/i
];

/** Soft FAIL guard (non-rendered): collect paths whose rendered strings carry Soft-/ops jargon. */
export function collectOpsJargonPaths(incident: Incident): string[] {
  const bad: string[] = [];
  const check = (path: string, value: string | undefined) => {
    if (!value) return;
    for (const re of FORENSIC_OPS_JARGON_PATTERNS) {
      if (re.test(value)) {
        bad.push(`${path}: ${re}`);
        break;
      }
    }
  };
  check("title", incident.title);
  check("amountSummary", incident.amountSummary);
  incident.chains.forEach((c, i) => check(`chains[${i}]`, c));
  incident.sources.forEach((s, i) => {
    check(`sources[${i}].title`, s.title);
    check(`sources[${i}].url`, s.url);
  });
  if (incident.background) {
    check("background.protocolType", String(incident.background.protocolType));
    incident.background.sizeMetrics?.forEach((m, mi) => {
      check(`background.sizeMetrics[${mi}].label`, m.label);
      check(`background.sizeMetrics[${mi}].value`, m.value);
      check(`background.sizeMetrics[${mi}].asOf`, m.asOf);
    });
    incident.background.notes?.forEach((n, ni) => {
      check(`background.notes[${ni}].text`, n.text);
    });
  }
  incident.sections.forEach((sec, si) => {
    check(`sections[${si}].title`, sec.title);
    sec.claims.forEach((c, ci) => check(`sections[${si}].claims[${ci}].text`, c.text));
    sec.bullets?.forEach((b, bi) => check(`sections[${si}].bullets[${bi}].text`, b.text));
    sec.figures?.forEach((f, fi) => {
      check(`sections[${si}].figures[${fi}].label`, f.label);
      check(`sections[${si}].figures[${fi}].amount`, f.amount);
    });
  });
  return bad;
}

