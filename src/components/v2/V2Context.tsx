/**
 * @file V2Context.tsx
 * @description Shared V2 navigation + Eric-loop prefill context (#295)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { V2MoveAction, V2PrimaryNav } from "./nav";
import { V2_DEFAULT_NAV } from "./nav";

export type V2Prefill = {
  symbol?: string;
  chainId?: number;
  amount?: string;
};

type V2ContextValue = {
  nav: V2PrimaryNav;
  setNav: (n: V2PrimaryNav) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  moveAction: V2MoveAction | null;
  setMoveAction: (a: V2MoveAction | null) => void;
  prefill: V2Prefill;
  setPrefill: (p: V2Prefill) => void;
  /** Remember last network chip for Eric loop convenience. */
  lastChainId: number | null;
  setLastChainId: (id: number | null) => void;
  /** Navigate to Move with asset/chain prefilled (≤3 interactions). */
  goTrade: (p: V2Prefill & { action?: V2MoveAction }) => void;
};

const V2Context = createContext<V2ContextValue | null>(null);

export function V2Provider({ children }: { children: ReactNode }) {
  const [nav, setNavState] = useState<V2PrimaryNav>(V2_DEFAULT_NAV);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moveAction, setMoveAction] = useState<V2MoveAction | null>(null);
  const [prefill, setPrefill] = useState<V2Prefill>({});
  const [lastChainId, setLastChainId] = useState<number | null>(1);

  const setNav = useCallback((n: V2PrimaryNav) => {
    setNavState(n);
    setSettingsOpen(false);
    if (n !== "move") setMoveAction(null);
  }, []);

  const goTrade = useCallback(
    (p: V2Prefill & { action?: V2MoveAction }) => {
      const { action = "swap", ...rest } = p;
      setPrefill(rest);
      if (rest.chainId != null) setLastChainId(rest.chainId);
      setMoveAction(action);
      setNavState("move");
      setSettingsOpen(false);
    },
    []
  );

  const value = useMemo(
    () => ({
      nav,
      setNav,
      settingsOpen,
      setSettingsOpen,
      moveAction,
      setMoveAction,
      prefill,
      setPrefill,
      lastChainId,
      setLastChainId,
      goTrade
    }),
    [
      nav,
      setNav,
      settingsOpen,
      moveAction,
      prefill,
      lastChainId,
      goTrade
    ]
  );

  return <V2Context.Provider value={value}>{children}</V2Context.Provider>;
}

export function useV2(): V2ContextValue {
  const ctx = useContext(V2Context);
  if (!ctx) throw new Error("useV2 requires V2Provider");
  return ctx;
}
