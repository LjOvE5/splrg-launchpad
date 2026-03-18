export const CHAIN_IDS = {
  monadMainnet: 143,
  monadTestnet: 10143,
};

export const RPC_URLS = {
  [CHAIN_IDS.monadMainnet]: 'https://rpc-mainnet.monadinfra.com/rpc/sK3sicffUfrxEa69IHFkE0RBP1nWHgji',
  [CHAIN_IDS.monadTestnet]: 'https://testnet-rpc.monad.xyz',
};

/** Fallback RPCs to try if primary fails (e.g. rate limit or downtime). */
export const FALLBACK_RPC_URLS: Partial<Record<number, string[]>> = {
  [CHAIN_IDS.monadMainnet]: [
    'https://monad-mainnet.api.onfinality.io/public',
    'https://rpc.monad.xyz',
  ],
  [CHAIN_IDS.monadTestnet]: ['https://testnet-rpc.monad.xyz'],
};

export const BLOCK_EXPLORERS = {
  [CHAIN_IDS.monadMainnet]: 'https://monadvision.com',
  [CHAIN_IDS.monadTestnet]: 'https://testnet.monadexplorer.com',
};

export const MONAD_MAINNET_CONFIG = {
  chainId: 143,
  name: 'Monad Mainnet',
  ticker: 'MON',
  atomicUnit: 'wei',
  decimals: 18,
  rpcUrl: 'https://rpc-mainnet.monadinfra.com/rpc/sK3sicffUfrxEa69IHFkE0RBP1nWHgji',
  explorerUrl: 'https://monadvision.com'
}

export const MONAD_TESTNET_CONFIG = {
  chainId: 10143,
  name: 'Monad Testnet',
  ticker: 'MON',
  atomicUnit: 'wei',
  decimals: 18,
  rpcUrl: 'https://testnet-rpc.monad.xyz',
  explorerUrl: 'https://testnet.monadexplorer.com'
}

export type NetworkConfig = typeof MONAD_MAINNET_CONFIG

export const getNetworkConfig = (): NetworkConfig => {
  return MONAD_MAINNET_CONFIG
}

/** RPC URL for a given chain ID (mainnet 143, testnet 10143). Falls back to mainnet. */
export const getRpcUrlForChainId = (chainId: number | null): string => {
  if (chainId != null && RPC_URLS[chainId as keyof typeof RPC_URLS]) {
    return RPC_URLS[chainId as keyof typeof RPC_URLS];
  }
  return MONAD_MAINNET_CONFIG.rpcUrl;
}

// NFT collection on Irys (Arweave)
export const IRYS_IMAGE_BASE = 'https://gateway.irys.xyz/7w293UmAN7y4jbiQoB7Ls2eiYr63Qgs81ZNHWq43xbJQ/'
export const IRYS_METADATA_BASE = 'https://gateway.irys.xyz/5vUkF5jcznTGUznTTjJyrPiPM88E6zMTkG6HTFxPvjLt/'

// Admin panel: only this wallet can access
export const ADMIN_WALLET_ADDRESS = '0xf05443b49521Babda752Fa6ab8ad2B3eF51CB68f'.toLowerCase()

// Mint phases display
export const PREMINTED_SUPPLY = 150
export const WHITELIST_PRICE_MON = 1700
export const WHITELIST_DURATION_HOURS = 6
export const PUBLIC_PRICE_MON = 2100

/** Frontend-only test mode: show 0.01 $MON, treat mint as active, send 0.01 MON on mint. Set to false when done testing. */
export const TEST_MINT_MODE = false