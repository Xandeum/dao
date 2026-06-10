import type { NextApiRequest, NextApiResponse } from 'next'
import {
  JUPITER_API_KEY_ENV_VAR,
  JUPITER_PRICE_BATCH_LIMIT,
} from '@utils/jupiterApi'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ids = (typeof req.query.ids === 'string' ? req.query.ids : '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (ids.length === 0) {
    return res.status(400).json({ error: 'ids query parameter is required' })
  }

  if (ids.length > JUPITER_PRICE_BATCH_LIMIT) {
    return res.status(400).json({
      error: `ids supports up to ${JUPITER_PRICE_BATCH_LIMIT} mints per request`,
    })
  }

  const apiKey = process.env[JUPITER_API_KEY_ENV_VAR]

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: `${JUPITER_API_KEY_ENV_VAR} not provided in env` })
  }

  try {
    const url = new URL('https://api.jup.ag/price/v3')
    url.searchParams.set('ids', ids.join(','))

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
      },
    })
    const body = await response.json()

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300')

    return res.status(response.status).json(body)
  } catch (error) {
    console.error('Error fetching Jupiter prices:', error)
    return res.status(500).json({ error: 'Failed to fetch Jupiter prices' })
  }
}

export default handler
