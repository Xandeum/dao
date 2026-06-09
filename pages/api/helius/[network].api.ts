import type { NextApiRequest, NextApiResponse } from 'next'
import {
  HELIUS_DEVNET_RPC_ENV_VAR,
  HELIUS_MAINNET_RPC_ENV_VAR,
  HeliusNetwork,
} from '@utils/heliusApi'

const getHeliusRpcUrl = (network: HeliusNetwork) => {
  if (network === 'devnet') {
    return process.env[HELIUS_DEVNET_RPC_ENV_VAR]
  }

  return process.env[HELIUS_MAINNET_RPC_ENV_VAR]
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const network = req.query.network
  if (network !== 'mainnet' && network !== 'devnet') {
    return res.status(400).json({ error: 'Unsupported network' })
  }

  const rpcUrl = getHeliusRpcUrl(network)
  if (!rpcUrl) {
    const envVar =
      network === 'devnet'
        ? HELIUS_DEVNET_RPC_ENV_VAR
        : HELIUS_MAINNET_RPC_ENV_VAR
    return res.status(500).json({ error: `${envVar} not provided in env` })
  }

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })
    const body = await response.json()

    res.setHeader('Cache-Control', 'no-store')
    return res.status(response.status).json(body)
  } catch (error) {
    console.error(`Error proxying Helius ${network} request:`, error)
    return res.status(500).json({ error: 'Failed to proxy Helius request' })
  }
}

export default handler
