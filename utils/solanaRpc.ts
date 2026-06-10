export const SOLANA_MAINNET_PROXY_PATH = '/api/solana/mainnet'
export const SOLANA_DEVNET_PROXY_PATH = '/api/solana/devnet'

type SolanaNetwork = 'mainnet' | 'devnet'

const PUBLIC_HTTP_ENDPOINTS: Record<SolanaNetwork, string> = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
}

const PUBLIC_WS_ENDPOINTS: Record<SolanaNetwork, string> = {
  mainnet: 'wss://api.mainnet-beta.solana.com',
  devnet: 'wss://api.devnet.solana.com',
}

const SERVER_ENV_VARS: Record<SolanaNetwork, string> = {
  mainnet: 'MAINNET_RPC',
  devnet: 'DEVNET_RPC',
}

const PROXY_PATHS: Record<SolanaNetwork, string> = {
  mainnet: SOLANA_MAINNET_PROXY_PATH,
  devnet: SOLANA_DEVNET_PROXY_PATH,
}

export const getSolanaRpcEndpoint = (network: SolanaNetwork) => {
  if (typeof window !== 'undefined') {
    return new URL(PROXY_PATHS[network], window.location.origin).toString()
  }

  return process.env[SERVER_ENV_VARS[network]] || PUBLIC_HTTP_ENDPOINTS[network]
}

export const getSolanaWsEndpoint = (network: SolanaNetwork) =>
  PUBLIC_WS_ENDPOINTS[network]
