/**
 * @file actionNetworks.ts
 * @description Per-action network prefs — registry, resolve, persist helpers (#156)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  BILLBOARD_CONTRACT,
  CHAT_FACTORY,
  CHAT_PRESETS,
  DEX_REGISTRY,
  ENS_CONTRACT,
  IMPLEMENTATION_ADDRESSES,
  SHARE_CONTRACT,
  SUPPORTED_CHAINS,
  VAULT_REGISTRY,
  chainShortName
} from "./constants";
import { ARB_EXECUTOR } from "./arb/constants";

/** Prefs blob key inside `0xterm_user_*` (export/import via existing preferences). */
export const ACTION_NETWORKS_PREF_KEY = "actionNetworks";

export type ActionKind = "write" | "read";

export type ActionId =
  | "swap"
  | "arb"
  | "vault"
  | "dig"
  | "chat"
  | "board"
  | "share"
  | "createpool"
  | "addliq"
  | "ens"
  | "sim"
  | "trace";

export type ActionDef = {
  id: ActionId;
  /** Mono command name shown in the Settings table. */
  label: string;
  kind: ActionKind;
  /** Supported chain ids; empty means all SUPPORTED_CHAINS. */
  supportedChainIds: number[];
};

export type ActionNetworkOverrides = Partial<Record<ActionId, number>>;

export type ResolveActionChainResult = {
  chainId: number | null;
  usedOverride: boolean;
  /** Present when a stored override is not in the action's supported set. */
  unsupportedOverride?: { chainId: number; shortName: string };
};

const dexChainIds = (): number[] =>
  Object.keys(DEX_REGISTRY)
    .map(Number)
    .filter((id) => (DEX_REGISTRY[id] || []).length > 0);

const arbChainIds = (): number[] => {
  const fromDex = dexChainIds().filter(
    (id) => (DEX_REGISTRY[id] || []).length >= 2
  );
  const fromExec = Object.keys(ARB_EXECUTOR).map(Number);
  return Array.from(new Set([...fromDex, ...fromExec]));
};

const vaultChainIds = (): number[] =>
  Object.keys(VAULT_REGISTRY)
    .map(Number)
    .filter((id) => (VAULT_REGISTRY[id] || []).length > 0);

const chatChainIds = (): number[] =>
  Array.from(
    new Set([
      ...Object.keys(CHAT_PRESETS).map(Number),
      ...Object.keys(CHAT_FACTORY).map(Number)
    ])
  );

const boardChainIds = (): number[] =>
  Object.keys(BILLBOARD_CONTRACT).map(Number);

const shareChainIds = (): number[] =>
  Object.keys(SHARE_CONTRACT).map(Number);

const ensChainIds = (): number[] =>
  Array.from(new Set([1, ...Object.keys(ENS_CONTRACT).map(Number)]));

const digChainIds = (): number[] =>
  Array.from(
    new Set([
      ...SUPPORTED_CHAINS.map((c) => c.id),
      ...Object.keys(IMPLEMENTATION_ADDRESSES).map(Number)
    ])
  );

const allChainIds = (): number[] => SUPPORTED_CHAINS.map((c) => c.id);

/** Shipping actions that pick a chain — WRITE then READ (#156). */
export const ACTION_NETWORK_REGISTRY: readonly ActionDef[] = [
  {
    id: "swap",
    label: "swap",
    kind: "write",
    supportedChainIds: dexChainIds()
  },
  {
    id: "arb",
    label: "arb",
    kind: "write",
    supportedChainIds: arbChainIds()
  },
  {
    id: "vault",
    label: "vault",
    kind: "write",
    supportedChainIds: vaultChainIds()
  },
  {
    id: "dig",
    label: "dig",
    kind: "write",
    supportedChainIds: digChainIds()
  },
  {
    id: "chat",
    label: "chat",
    kind: "write",
    supportedChainIds: chatChainIds()
  },
  {
    id: "board",
    label: "board",
    kind: "write",
    supportedChainIds: boardChainIds()
  },
  {
    id: "share",
    label: "share",
    kind: "write",
    supportedChainIds: shareChainIds()
  },
  {
    id: "createpool",
    label: "createpool",
    kind: "write",
    supportedChainIds: dexChainIds()
  },
  {
    id: "addliq",
    label: "addliq",
    kind: "write",
    supportedChainIds: dexChainIds()
  },
  {
    id: "ens",
    label: "ens",
    kind: "read",
    supportedChainIds: ensChainIds()
  },
  {
    id: "sim",
    label: "sim",
    kind: "read",
    supportedChainIds: allChainIds()
  },
  {
    id: "trace",
    label: "trace",
    kind: "read",
    supportedChainIds: allChainIds()
  }
];

export const WRITE_ACTIONS = ACTION_NETWORK_REGISTRY.filter(
  (a) => a.kind === "write"
);
export const READ_ACTIONS = ACTION_NETWORK_REGISTRY.filter(
  (a) => a.kind === "read"
);

export function getActionDef(actionId: ActionId): ActionDef | undefined {
  return ACTION_NETWORK_REGISTRY.find((a) => a.id === actionId);
}

export function shortNameForChainId(chainId: number | null | undefined): string {
  if (chainId == null) return "";
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  return chain ? chainShortName(chain) : `CHAIN ${chainId}`;
}

export function emptyActionNetworkOverrides(): ActionNetworkOverrides {
  return {};
}

/** Parse overrides from prefs blob; drop non-numeric / unknown action ids. */
export function parseActionNetworkOverrides(
  raw: unknown
): ActionNetworkOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyActionNetworkOverrides();
  }
  const out: ActionNetworkOverrides = {};
  const known = new Set(ACTION_NETWORK_REGISTRY.map((a) => a.id));
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!known.has(key as ActionId)) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) continue;
    out[key as ActionId] = n;
  }
  return out;
}

export function countOverrides(overrides: ActionNetworkOverrides): number {
  return Object.keys(overrides).length;
}

export function setActionOverride(
  overrides: ActionNetworkOverrides,
  actionId: ActionId,
  chainId: number | null
): ActionNetworkOverrides {
  const next = { ...overrides };
  if (chainId == null) {
    delete next[actionId];
  } else {
    next[actionId] = chainId;
  }
  return next;
}

export function clearAllOverrides(): ActionNetworkOverrides {
  return emptyActionNetworkOverrides();
}

/**
 * Resolve the chain an action should run on.
 * - Override wins when it is still supported.
 * - Unsupported override → fall back to default (usedOverride false) and surface warn meta.
 * - Changing default never clears overrides (caller responsibility).
 */
export function resolveActionChain(
  actionId: ActionId,
  defaultChainId: number | null,
  overrides: ActionNetworkOverrides
): ResolveActionChainResult {
  const def = getActionDef(actionId);
  const supported = def?.supportedChainIds ?? allChainIds();
  const override = overrides[actionId];

  if (override != null) {
    if (supported.includes(override)) {
      return { chainId: override, usedOverride: true };
    }
    return {
      chainId: defaultChainId,
      usedOverride: false,
      unsupportedOverride: {
        chainId: override,
        shortName: shortNameForChainId(override)
      }
    };
  }

  return { chainId: defaultChainId, usedOverride: false };
}

/** Console / receipt one-liner — muted `on BASE` or `on BASE (override)`. */
export function formatActionNetworkLine(
  chainId: number | null,
  usedOverride: boolean
): string | null {
  if (chainId == null) return null;
  const short = shortNameForChainId(chainId);
  if (!short) return null;
  return usedOverride ? `on ${short} (override)` : `on ${short}`;
}

/** First select option label: `DEFAULT (BASE)`. */
export function formatDefaultOptionLabel(defaultChainId: number | null): string {
  const short = shortNameForChainId(defaultChainId) || "—";
  return `DEFAULT (${short})`;
}

/** Map CLI / panel command name → action id (createpool/addliq stay distinct). */
export function actionIdFromCommand(cmd: string): ActionId | null {
  const c = cmd.toLowerCase();
  const hit = ACTION_NETWORK_REGISTRY.find((a) => a.id === c);
  return hit ? hit.id : null;
}
