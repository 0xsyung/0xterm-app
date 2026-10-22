/**
 * @file index.ts
 * @description ProPass / Pro membership public surface (Soft ACK #139)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
export * from "./constants";
export * from "./buy";
export * from "./status";
export * from "./preflight";
export { runProCommand, type ProRunCtx } from "./runPro";
export { default as ProChip } from "./ProChip";
export { default as ProBuyPanel } from "./ProBuyPanel";
export { default as ProStatusPanel } from "./ProStatusPanel";
export { default as ProSurface, type ProSurfaceMode } from "./ProSurface";
