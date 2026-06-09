export const HELIUS_MAINNET_RPC_ENV_VAR = 'HELIUS_MAINNET_RPC'
export const HELIUS_DEVNET_RPC_ENV_VAR = 'HELIUS_DEVNET_RPC'
export const HELIUS_MAINNET_PROXY_PATH = '/api/helius/mainnet'
export const HELIUS_DEVNET_PROXY_PATH = '/api/helius/devnet'

export type HeliusNetwork = 'mainnet' | 'devnet'

export const getHeliusProxyPath = (network: HeliusNetwork) =>
  network === 'devnet' ? HELIUS_DEVNET_PROXY_PATH : HELIUS_MAINNET_PROXY_PATH
