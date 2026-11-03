/**
 * @file index.ts
 * @description V2 portfolio manager public exports (#295)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
export { default as V2Shell } from "./V2Shell";
export { V2Provider, useV2 } from "./V2Context";
export { getV2Theme, FINANCE_THEME, V2_THEME_KEY } from "./theme";
export {
  V2_PRIMARY_NAV,
  V2_NAV_LABEL,
  V2_DEFAULT_NAV,
  V2_MOVE_ACTIONS,
  V2_PNL_PERIODS,
  V2_CHAIN_CHIPS,
  isV2PrimaryNav
} from "./nav";
export type { V2PrimaryNav, V2NavId, V2MoveAction, V2PnlPeriod } from "./nav";
export {
  V2_MAINNET_CHAINS,
  V2_MAINNET_IDS,
  isV2Mainnet,
  v2ChainShortName
} from "./networks";
