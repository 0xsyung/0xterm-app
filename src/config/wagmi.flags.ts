/**
 * @file wagmi.flags.ts
 * @description AppKit flag constants for V2 (#310) — importable without createAppKit
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

/**
 * Breaks Reown AppKit UnsupportedChain modal trap on iOS Safari (#310).
 * When false (AppKit default), a restored session on a non-configured chain
 * opens UnsupportedChain; ModalUtil.safeClose shakes; failed MetaMask mobile
 * switchChain reopens the modal forever. true → AppKit skips showUnsupportedChainUI;
 * V2Shell clears the stale session and shows a dismissible banner instead.
 */
export const V2_ALLOW_UNSUPPORTED_CHAIN = true as const;
