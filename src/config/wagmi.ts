/**
 * @file wagmi.ts
 * @description Wagmi & AppKit — V2 mainnets + MetaMask / WalletConnect (#295 #310)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import {
  mainnet,
  arbitrum,
  base,
  polygon,
  optimism,
  hyperliquid
} from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { V2_ALLOW_UNSUPPORTED_CHAIN } from './wagmi.flags'

const projectId = '5b2bbdbe0deaa155601b8aaa96f96aaf'

/** Day-one mainnets only (HyperEVM via AppKit hyperliquid network id 999). */
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet as AppKitNetwork,
  arbitrum as AppKitNetwork,
  base as AppKitNetwork,
  polygon as AppKitNetwork,
  optimism as AppKitNetwork,
  hyperliquid as AppKitNetwork
]

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
})

const metadata = {
  name: '0xTERM',
  description: 'Multi-chain portfolio manager',
  url: 'https://app.0xterm.xyz',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

/** MetaMask — WalletConnect QR remains available via AppKit protocol path. */
const METAMASK_ID =
  'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96'

export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  themeMode: 'dark',
  featuredWalletIds: [METAMASK_ID],
  includeWalletIds: [METAMASK_ID],
  allWallets: 'HIDE',
  // #310: stop UnsupportedChain modal trap on iOS Safari after failed WC switch.
  // Stale sessions are cleared in V2Shell (disconnect + dismissible banner).
  allowUnsupportedChain: V2_ALLOW_UNSUPPORTED_CHAIN,
  features: {
    analytics: false,
    email: false,
    socials: false
  }
})

export const config = wagmiAdapter.wagmiConfig
