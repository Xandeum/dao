const JUPITER_API_BASE_URL = 'https://api.jup.ag'

export const JUPITER_API_KEY_ENV_VAR = 'JUPITER_API_KEY'
export const JUPITER_PRICE_BATCH_LIMIT = 50
export const JUPITER_PRICE_PROXY_PATH = '/api/jupiter/price'
export const JUPITER_TOKENS_TAG_PROXY_PATH = '/api/jupiter/tokens/tag'
export const JUPITER_TOKEN_TAGS = ['verified', 'lst'] as const

export type JupiterTokenTag = (typeof JUPITER_TOKEN_TAGS)[number]

const isServer = () => typeof window === 'undefined'

const buildProxyUrl = (pathname: string, params: Record<string, string>) => {
  const searchParams = new URLSearchParams(params)
  return `${pathname}?${searchParams.toString()}`
}

const buildJupiterUrl = (pathname: string, params: Record<string, string>) => {
  const url = new URL(pathname, JUPITER_API_BASE_URL)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return url.toString()
}

const getServerHeaders = (): HeadersInit => {
  const apiKey = process.env[JUPITER_API_KEY_ENV_VAR]

  if (!apiKey) {
    throw new Error(`${JUPITER_API_KEY_ENV_VAR} is not configured`)
  }

  return {
    'x-api-key': apiKey,
  }
}

const fetchJupiterJson = async <T>({
  pathname,
  proxyPath,
  params,
}: {
  pathname: string
  proxyPath: string
  params: Record<string, string>
}): Promise<T> => {
  const response = await fetch(
    isServer()
      ? buildJupiterUrl(pathname, params)
      : buildProxyUrl(proxyPath, params),
    {
      headers: isServer() ? getServerHeaders() : undefined,
    },
  )

  if (!response.ok) {
    throw new Error(`Jupiter request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const fetchJupiterPriceJson = async <T>(ids: string[]) =>
  fetchJupiterJson<T>({
    pathname: '/price/v3',
    proxyPath: JUPITER_PRICE_PROXY_PATH,
    params: {
      ids: ids.join(','),
    },
  })

export const fetchJupiterTokensByTagJson = async <T>(query: JupiterTokenTag) =>
  fetchJupiterJson<T>({
    pathname: '/tokens/v2/tag',
    proxyPath: JUPITER_TOKENS_TAG_PROXY_PATH,
    params: {
      query,
    },
  })
