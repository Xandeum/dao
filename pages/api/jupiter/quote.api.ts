import type { NextApiRequest, NextApiResponse } from 'next'
import {
  JUPITER_API_KEY_ENV_VAR,
  buildJupiterSwapUrl,
} from '@utils/jupiterApi'

const REQUIRED_QUERY_PARAMS = [
  'inputMint',
  'outputMint',
  'amount',
  'slippageBps',
  'swapMode',
] as const

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const params = Object.fromEntries(
    Object.entries(req.query).flatMap(([key, value]) =>
      typeof value === 'string' ? [[key, value]] : [],
    ),
  )

  const missing = REQUIRED_QUERY_PARAMS.filter((key) => !params[key])
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing query params: ${missing.join(', ')}`,
    })
  }

  const apiKey = process.env[JUPITER_API_KEY_ENV_VAR]

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: `${JUPITER_API_KEY_ENV_VAR} not provided in env` })
  }

  try {
    const response = await fetch(buildJupiterSwapUrl('/swap/v1/quote', params), {
      headers: {
        'x-api-key': apiKey,
      },
    })
    const body = await response.json()

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60')

    return res.status(response.status).json(body)
  } catch (error) {
    console.error('Error fetching Jupiter quote:', error)
    return res.status(500).json({ error: 'Failed to fetch Jupiter quote' })
  }
}

export default handler
