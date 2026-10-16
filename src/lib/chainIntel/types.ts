/**
 * @file types.ts
 * @description Shared KYT/KYA label + result types (#16/#17/#170)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type LabelKind = "ofac" | "mixer" | "bridge" | "cex";
export type RiskBand = "clear" | "caution" | "high";

export type Label = {
  address: `0x${string}`;
  chainId: number | "evm";
  kind: LabelKind;
  name: string;
  source: string;
  sourceAsOf: string;
};

export type HopEdge = {
  txHash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  valueWei: string;
  asset: "native" | `0x${string}`;
  hop: number;
};

export type KytHit = {
  address: `0x${string}`;
  label: Label;
  hop: number;
  direction: "funded-by" | "sent-to";
};

export type KytResult = {
  mode: "heuristic v1" | `vendor: ${string}`;
  chainId: number;
  chainName: string;
  txHash: `0x${string}`;
  from: `0x${string}` | null;
  to: `0x${string}` | null;
  valueWei: string;
  blockNumber: number | null;
  band: RiskBand;
  hopsRequested: number;
  truncated: boolean;
  hits: KytHit[];
  edges: HopEdge[];
  ofacAsOf: string;
  labelSetVersion: string;
};

export type KyaCounterparty = {
  address: `0x${string}`;
  txCount: number;
  lastTx: `0x${string}`;
  label?: Label;
};

export type KyaSeen = {
  block: number;
  ts: number;
  txHash: `0x${string}`;
};

export type KyaResult = {
  mode: "heuristic v1" | `vendor: ${string}`;
  chainId: number;
  chainName: string;
  address: `0x${string}`;
  ens?: string;
  firstSeen?: KyaSeen;
  lastSeen?: KyaSeen;
  sampledTxCount: number;
  truncated: boolean;
  nativeInWei: string;
  nativeOutWei: string;
  counterparties: KyaCounterparty[];
  subjectLabels: Label[];
  ofacAsOf: string;
  labelSetVersion: string;
  band: RiskBand;
};
