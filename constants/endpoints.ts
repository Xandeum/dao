import { getSolanaRpcEndpoint, getSolanaWsEndpoint } from '@utils/solanaRpc'

export const MAINNET_RPC = getSolanaRpcEndpoint('mainnet')
export const DEVNET_RPC = getSolanaRpcEndpoint('devnet')

export const MAINNET_WS_RPC = getSolanaWsEndpoint('mainnet')
export const DEVNET_WS_RPC = getSolanaWsEndpoint('devnet')
