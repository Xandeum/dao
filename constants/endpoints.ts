export const MAINNET_RPC =
  process.env.NEXT_PUBLIC_MAINNET_RPC ||
  process.env.MAINNET_RPC ||
  'https://api.mainnet-beta.solana.com'

export const DEVNET_RPC =
  process.env.NEXT_PUBLIC_DEVNET_RPC ||
  process.env.DEVNET_RPC ||
  'https://api.devnet.solana.com'
