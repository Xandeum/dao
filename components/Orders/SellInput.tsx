import NumberFormat, {
  NumberFormatValues,
  SourceInfo,
} from 'react-number-format'
import store, { TokenDetails } from 'stores/store'
import MaxAmountButton from '@components/shared/MaxAmountButton'
import WalletIcon from '@components/icons/WalletIcon'
import SwapTokenSelect from './SwapTokenSelect'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { floorToDecimal, formatCurrencyValue } from 'utils/numbers'
import { fetchLastPriceForMints, fetchMetadataForMints } from 'utils/tokens'
import Decimal from 'decimal.js'
import SearchModal from '@components/modals/SearchModal'
import { MetadataItem } from 'hooks/useMetaData'

const set = store.getState().set
const metadataCache = new Map<string, MetadataItem[]>()

const SIZE_VALUES = ['50', '100'] as const
type SizeValue = (typeof SIZE_VALUES)[number]

const MAX_DIGITS = 11
export const withValueLimit = (values: NumberFormatValues): boolean => {
  return values.floatValue
    ? values.floatValue.toFixed(0).length <= MAX_DIGITS
    : true
}

const SellInput = ({
  max,
  decimals,
  error,
  setError,
}: {
  max: string
  decimals: number
  error: string | undefined
  setError: (e: string) => void
}) => {
  const amountInFormValue = store((s) => s.swap.amountIn)
  const [showSelectList, setShowSelectList] = useState(false)

  const connection = store((s) => s.connection)
  const mint = store((s) => s.swap.sell.mint)
  const imageUrl = store((s) => s.swap.sell.image_url)
  const symbol = store((s) => s.swap.sell.symbol)
  const { data: sellTokenInfo, isInitialLoading: loadingSellTokenInfo } =
    useQuery(
      ['sell-swap-token-info', mint],
      () => fetchMetadataForMints([mint], metadataCache, connection),
      {
        cacheTime: 1000 * 60 * 30,
        staleTime: 1000 * 60 * 30,
        retry: 3,
        enabled: !!mint,
        refetchOnWindowFocus: false,
      },
    )
  const { data: lastPrice } = useQuery(
    ['sell-swap-token-price', mint],
    () => fetchLastPriceForMints([mint]),
    {
      cacheTime: 1000 * 60 * 30,
      staleTime: 1000 * 60 * 30,
      retry: 3,
      enabled: !!mint,
      refetchOnWindowFocus: false,
    },
  )

  const setAmountInFormValue = (amountIn: string) => {
    set((s) => {
      s.swap.amountIn = amountIn
    })
  }

  const handleAmountInChange = (e: NumberFormatValues, info: SourceInfo) => {
    if (info.source !== 'event') return

    const value = e.value === '.' ? '0.' : e.value
    setAmountInFormValue(value)
    if (error) {
      setError('')
    }
  }

  const handleSizePercentage = (percentage: '' | SizeValue) => {
    const walletMaxDecimal = new Decimal(max)
    if (walletMaxDecimal.gt(0) && percentage) {
      let amount = walletMaxDecimal.mul(percentage).div(100)
      if (percentage !== '100') {
        amount = floorToDecimal(amount, decimals)
      }
      setAmountInFormValue(amount.toFixed())
    } else {
      setAmountInFormValue('')
    }
    if (error) {
      setError('')
    }
  }

  const handleSelect = (token: TokenDetails) => {
    const { mint, imageUrl, symbol } = token ?? {}
    if (mint) {
      set((state) => {
        state.swap.sell = { mint, image_url: imageUrl, symbol }
      })
    }
    setShowSelectList(false)
  }

  return (
    <>
      <div className="grid grid-cols-2 rounded-t-xl">
        <div className="col-span-2 mb-2 flex items-center justify-between">
          <p className="text-th-fgd-1">Sell</p>
          {mint ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs">
                <MaxAmountButton
                  decimals={decimals}
                  label={<WalletIcon className="size-3" />}
                  onClick={() => handleSizePercentage('100')}
                  value={max}
                  disabled={max === '0'}
                />
              </span>
            </div>
          ) : null}
        </div>
        <div className="col-span-2 mb-2 flex items-center justify-between">
          <SwapTokenSelect
            imageUrl={imageUrl || sellTokenInfo?.[0]?.image_url}
            symbol={symbol || sellTokenInfo?.[0]?.symbol}
            loading={loadingSellTokenInfo}
            showList={setShowSelectList}
          />
          <SizeButtons
            onClick={handleSizePercentage}
            showClear={!!amountInFormValue}
            sizeValues={SIZE_VALUES}
          />
        </div>
        <div className="col-span-2">
          {/* {loading ? (
          <div className="flex h-12 w-full items-center justify-center  rounded-lg bg-th-input-bkg">
            <Loading />
          </div>
        ) : ( */}
          <div className="flex items-center">
            <NumberFormat
              inputMode="decimal"
              thousandSeparator=","
              allowNegative={false}
              isNumericString={true}
              decimalScale={decimals || 6}
              name="amount"
              id="amount"
              className="box-border h-10 w-full bg-transparent font-mono text-xl text-th-fgd-1 focus:outline-none md:hover:bg-transparent"
              placeholder="0.00"
              value={amountInFormValue}
              onValueChange={handleAmountInChange}
              isAllowed={withValueLimit}
            />
            <p className="font-mono text-xs text-th-fgd-4">
              {amountInFormValue
                ? lastPrice?.[0]?.price
                  ? formatCurrencyValue(
                      parseFloat(amountInFormValue) * lastPrice[0].price,
                    )
                  : '–'
                : '$0.00'}
            </p>
          </div>
        </div>
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

export default SellInput

export const SizeButtons = <
  TValue extends readonly string[],
  TShowClear extends boolean,
>({
  onClick,
  showClear,
  sizeValues,
}: {
  onClick: (
    p: TShowClear extends true ? TValue[number] | '' : TValue[number],
  ) => void
  showClear: TShowClear
  sizeValues: TValue
}) => {
  const valuesToShow = showClear ? ['', ...sizeValues] : sizeValues
  return (
    <div className="space-x-0.5">
      {valuesToShow.map((v) => (
        <button
          key={v}
          className="h-6 rounded-md border border-th-input-border bg-th-input-bkg px-1 font-mono text-xxs focus:outline-none sm:h-7 sm:px-1.5 md:hover:bg-th-bkg-4"
          onClick={() => onClick(v)}
        >
          {v === '' ? 'Clear' : v === '100' ? 'Max' : `${v}%`}
        </button>
      ))}
    </div>
  )
}
