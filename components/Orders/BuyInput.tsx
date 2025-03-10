import InlineNotification from '@components/shared/InlineNotification'
import store, { TokenDetails } from 'stores/store'
import SwapTokenSelect from './SwapTokenSelect'
import { useQuery } from '@tanstack/react-query'
import { fetchLastPriceForMints, fetchMetadataForMints } from 'utils/tokens'
import {
  floorToDecimal,
  formatCurrencyValue,
  formatNumericValue,
} from 'utils/numbers'
import { useMemo, useState } from 'react'
import SheenLoader from '@components/loading/SheenLoader'
import SearchModal from '@components/modals/SearchModal'
import { walletBalanceForToken } from '@components/trade/MarketTradeForm'
import { useWalletTokens } from 'hooks/useWalletTokens'
import FormatNumericValue from '@components/shared/FormatNumericValue'
import WalletIcon from '@components/icons/WalletIcon'
import { MetadataItem } from 'hooks/useMetaData'

const set = store.getState().set
const metadataCache = new Map<string, MetadataItem[]>()

const BuyInput = ({
  outAmount,
  loading,
  error,
}: {
  outAmount: number
  loading: boolean
  error?: string
}) => {
  const { walletTokens } = useWalletTokens()
  const amountInFormValue = store((s) => s.swap.amountIn)
  const buyMint = store((s) => s.swap.buy.mint)
  const imageUrl = store((s) => s.swap.buy.image_url)
  const symbol = store((s) => s.swap.buy.symbol)
  const [showSelectList, setShowSelectList] = useState(false)
  const connection = store((s) => s.connection)

  const { data: buyTokenInfo, isInitialLoading: loadingBuyTokenInfo } =
    useQuery(
      ['buy-swap-token-info', buyMint],
      () => fetchMetadataForMints([buyMint], metadataCache, connection),
      {
        cacheTime: 1000 * 60 * 30,
        staleTime: 1000 * 60 * 30,
        retry: 3,
        enabled: !!buyMint,
        refetchOnWindowFocus: false,
      },
    )
  const { data: lastPrice } = useQuery(
    ['buy-swap-token-price', buyMint],
    () => fetchLastPriceForMints([buyMint]),
    {
      cacheTime: 1000 * 60 * 30,
      staleTime: 1000 * 60 * 30,
      retry: 3,
      enabled: !!buyMint,
      refetchOnWindowFocus: false,
    },
  )

  const [walletBalance, buyDecimals] = useMemo(() => {
    if (!buyMint) return ['0', 6]
    const walletBalance = walletBalanceForToken(walletTokens, buyMint)
    const max = floorToDecimal(
      walletBalance.balance,
      walletBalance.decimals,
    ).toFixed()
    return [max, walletBalance.decimals]
  }, [walletTokens, buyMint])

  const buyAmountDisplay = useMemo(() => {
    if (!amountInFormValue) return 0
    return outAmount ? outAmount : 0
  }, [amountInFormValue, outAmount])

  const handleSelect = (token: TokenDetails) => {
    const { mint, imageUrl, symbol } = token ?? {}
    if (mint) {
      set((state) => {
        state.swap.buy = { mint, image_url: imageUrl, symbol }
      })
    }
    setShowSelectList(false)
  }

  return (
    <>
      <div className={`grid grid-cols-2 rounded-t-xl`}>
        <div className="col-span-2 mb-2 flex items-center justify-between">
          <p className="text-th-fgd-1">Buy</p>
          <div className="flex items-center text-th-fgd-4">
            <WalletIcon className="mr-1 size-3" />
            <span className="font-mono text-xs">
              <FormatNumericValue
                value={walletBalance}
                decimals={buyDecimals}
              />
            </span>
          </div>
        </div>
        <div className="col-span-2 mb-2 flex items-center justify-between">
          <SwapTokenSelect
            imageUrl={imageUrl || buyTokenInfo?.[0]?.image_url}
            symbol={symbol || buyTokenInfo?.[0]?.symbol}
            loading={loadingBuyTokenInfo}
            showList={setShowSelectList}
          />
        </div>
        <div className="col-span-2 flex h-10 items-center justify-between">
          {loading ? (
            <>
              <SheenLoader>
                <div className={`h-7 w-44 bg-th-bkg-2`} />
              </SheenLoader>
              <SheenLoader>
                <div className={`h-3.5 w-12 bg-th-bkg-2`} />
              </SheenLoader>
            </>
          ) : (
            <>
              <p
                className={`font-mono text-xl ${
                  buyAmountDisplay ? 'text-th-fgd-1' : 'text-th-fgd-4'
                }`}
              >
                {buyAmountDisplay
                  ? buyTokenInfo?.[0]?.decimals
                    ? formatNumericValue(
                        buyAmountDisplay,
                        buyTokenInfo[0].decimals,
                      )
                    : formatNumericValue(buyAmountDisplay)
                  : '0.00'}
              </p>
              <p className="font-mono text-xs text-th-fgd-4">
                {buyAmountDisplay
                  ? lastPrice?.[0]?.price
                    ? formatCurrencyValue(buyAmountDisplay * lastPrice[0].price)
                    : '–'
                  : '$0.00'}
              </p>
            </>
          )}
        </div>
        {error ? (
          <div className="col-span-2 mt-1 flex justify-center">
            <InlineNotification
              type="error"
              desc={error}
              hideBorder
              hidePadding
            />
          </div>
        ) : null}
      </div>
      {showSelectList ? (
        <SearchModal
          isOpen={showSelectList}
          onClose={() => setShowSelectList(false)}
          onResultClick={handleSelect}
          isSwap
        />
      ) : null}
    </>
  )
}

export default BuyInput
