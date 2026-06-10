import type { NextApiRequest, NextApiResponse } from 'next'
import {
  JUPITER_API_KEY_ENV_VAR,
  JUPITER_TOKEN_TAGS,
  JupiterTokenTag,
} from '@utils/jupiterApi'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const query = typeof req.query.query === 'string' ? req.query.query : ''

  if (!JUPITER_TOKEN_TAGS.includes(query as JupiterTokenTag)) {
    return res.status(400).json({
      error: `query must be one of: ${JUPITER_TOKEN_TAGS.join(', ')}`,
    })
  }

  const apiKey = process.env[JUPITER_API_KEY_ENV_VAR]

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: `${JUPITER_API_KEY_ENV_VAR} not provided in env` })
  }

  try {
    const url = new URL('https://api.jup.ag/tokens/v2/tag')
    url.searchParams.set('query', query)

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
      },
    })
    const body = await response.json()

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')

    return res.status(response.status).json(body)
  } catch (error) {
    console.error('Error fetching Jupiter tokens by tag:', error)
    return res
      .status(500)
      .json({ error: 'Failed to fetch Jupiter tokens by tag' })
  }
}

export default handler
