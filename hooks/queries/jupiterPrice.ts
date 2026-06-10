import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { JUPITER_PRICE_BATCH_LIMIT, fetchJupiterPriceJson } from '@utils/jupiterApi'
import queryClient from './queryClient'

/* example query
# Unit price of 1 JUP & 1 SOL based on the Derived Price in USDC
https://api.jup.ag/price/v3?ids=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN,So11111111111111111111111111111111111111112

{
    "So11111111111111111111111111111111111111112": {
        "usdPrice": 133.890945000
    },
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": {
        "usdPrice": 0.751467
    }
}
*/

type Price = {
  id: string // pubkey,
  // price is in USD
  price: number
  // removed in v2 API
  // mintSymbol: string
  // vsToken: string // pubkey,
  // vsTokenSymbol: string
}
type Response = {
  data: Record<string, Price> //uses whatever you input (so, pubkey OR symbol). no entry if data not found
  timeTaken: number
}

type V3Price = {
  usdPrice?: number
  price?: number
}

type V3Response = Record<string, V3Price | null | undefined>

const isLegacyResponse = (
  response: Response | V3Response,
): response is Response => 'data' in response && 'timeTaken' in response

const normalizePriceResponse = (
  response: Response | V3Response,
): Response['data'] => {
  if (isLegacyResponse(response)) {
    return response.data
  }

  return Object.fromEntries(
    Object.entries(response)
      .filter(
        ([, data]) => data?.usdPrice !== undefined || data?.price !== undefined,
      )
      .map(([id, data]) => [
        id,
        {
          id,
          price: Number(data?.usdPrice ?? data?.price),
        },
      ]),
  ) as Response['data']
}

function* chunks<T>(arr: T[], n: number): Generator<T[], void> {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n)
  }
}

export const jupiterPriceQueryKeys = {
  all: ['Jupiter Price API'],
  byMint: (mint: PublicKey) => [...jupiterPriceQueryKeys.all, mint.toString()],
  byMints: (mints: PublicKey[]) => [
    ...jupiterPriceQueryKeys.all,
    mints.map((x) => x.toString()).sort(),
  ],
}

const fetchJupiterPriceBatch = async (
  mints: string[],
): Promise<Response['data']> => {
  const response = await fetchJupiterPriceJson<Response | V3Response>(mints)
  return normalizePriceResponse(response)
}

const jupQueryFn = async (mint: PublicKey) => {
  const result = (await fetchJupiterPriceBatch([mint.toString()]))[
    mint.toString()
  ]
  return result !== undefined
    ? ({ found: true, result } as const)
    : ({ found: false, result: undefined } as const)
}

export const useJupiterPriceByMintQuery = (mint: PublicKey | undefined) => {
  const enabled = mint !== undefined
  return useQuery({
    queryKey: enabled ? jupiterPriceQueryKeys.byMint(mint) : undefined,
    queryFn: async () => {
      if (!enabled) throw new Error()
      return jupQueryFn(mint)
    },
  })
}

export const fetchJupiterPrice = async (mint: PublicKey) =>
  queryClient.fetchQuery({
    queryKey: jupiterPriceQueryKeys.byMint(mint),
    queryFn: () => jupQueryFn(mint),
  })

/**
 * @deprecated
 * do not use this! it only exists to replace a previously existing synchronous function. use fetchJupiterPrice
 * */
export const getJupiterPriceSync = (mint: PublicKey) =>
  ((queryClient.getQueryData(jupiterPriceQueryKeys.byMint(mint)) as any)?.result
    ?.price as number) ?? 0

export const useJupiterPricesByMintsQuery = (mints: PublicKey[]) => {
  const enabled = mints.length > 0
  const deduped = new Set(mints)
  const dedupedMints = Array.from(deduped)

  return useQuery({
    enabled,
    queryKey: jupiterPriceQueryKeys.byMints(dedupedMints),
    queryFn: async () => {
      const batches = [
        ...chunks(dedupedMints, JUPITER_PRICE_BATCH_LIMIT),
      ]
      const responses = await Promise.all(
        batches.map((batch) =>
          fetchJupiterPriceBatch(batch.map((mint) => mint.toString())),
        ),
      )
      const data = responses.reduce(
        (acc, next) => ({ ...acc, ...next }),
        {} as Response['data'],
      )

      //override chai price if its broken
      const chaiMint = '3jsFX1tx2Z8ewmamiwSU851GzyzM2DJMq7KWW5DM8Py3'
      const chaiData = data[chaiMint]

      if (chaiData?.price && (chaiData.price > 1.3 || chaiData.price < 0.9)) {
        data[chaiMint] = {
          ...chaiData,
          price: 1,
        }
      }
      return data
    },
    onSuccess: (data) => {
      dedupedMints.forEach((mint) =>
        queryClient.setQueryData(
          jupiterPriceQueryKeys.byMint(mint),
          data[mint.toString()]
            ? ({ found: true, result: data[mint.toString()] } as const)
            : ({ found: false, result: undefined } as const),
        ),
      )
    },
  })
}

// function is used to get fresh token prices
export const getJupiterPricesByMintStrings = async (
  mints: string[],
): Promise<Response['data']> => {
  if (mints.length === 0) return {}
  const deduped = new Set(mints)
  const dedupedMints = Array.from(deduped)
  try {
    const batches = [...chunks(dedupedMints, 50)]
    const responses = await Promise.all(
      batches.map((batch) => fetchJupiterPriceBatch(batch)),
    )
    const data = responses.reduce(
      (acc, next) => ({ ...acc, ...next }),
      {} as Response['data'],
    )

    //override chai price if its broken
    const chaiMint = '3jsFX1tx2Z8ewmamiwSU851GzyzM2DJMq7KWW5DM8Py3'
    const chaiData = data[chaiMint]

    if (chaiData?.price && (chaiData.price > 1.3 || chaiData.price < 0.9)) {
      data[chaiMint] = {
        ...chaiData,
        price: 1,
      }
    }
    return data
  } catch (error) {
    console.error('Error fetching Jupiter prices:', error)
    throw error
  }
}
