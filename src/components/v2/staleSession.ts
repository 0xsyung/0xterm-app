/**
 * @file staleSession.ts
 * @description Stale WC session migration after #306 mainnet-only (#310)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { isV2Mainnet } from "./networks";

/**
 * Copy for the dismissible banner after we clear a restored session that
 * landed on a chain outside the V2 mainnet set (e.g. Sepolia post-#306).
 */
export const STALE_SESSION_BANNER =
  "Wallet was on an unsupported network. Reconnect on a supported mainnet.";

/**
 * True when a restored connected session reports a concrete chainId that is
 * not in V2_MAINNET_IDS. chainId undefined/null is NOT stale — wait for
 * hydration so we do not disconnect mid-rehydrate on iOS Safari.
 */
export function shouldClearStaleSession(args: {
  isConnected: boolean;
  chainId: number | null | undefined;
}): boolean {
  if (!args.isConnected) return false;
  if (args.chainId == null) return false;
  return !isV2Mainnet(args.chainId);
}
