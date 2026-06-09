import type { NextApiRequest, NextApiResponse } from 'next'

const getRpcEnvVar = (network: 'mainnet' | 'devnet') =>
  network === 'devnet' ? 'DEVNET_RPC' : 'MAINNET_RPC'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const network = req.query.network
  if (network !== 'mainnet' && network !== 'devnet') {
    return res.status(400).json({ error: 'Unsupported network' })
  }

  const rpcEnvVar = getRpcEnvVar(network)
  const rpcUrl = process.env[rpcEnvVar]

  if (!rpcUrl) {
    return res.status(500).json({ error: `${rpcEnvVar} not provided in env` })
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
    console.error(`Error proxying Solana ${network} request:`, error)
    return res.status(500).json({ error: 'Failed to proxy Solana request' })
  }
}

export default handler
