import { toUiDecimals } from '@blockworks-foundation/mango-v4'
import { abbreviateAddress } from './formatting'
import tokenPriceService from './services/tokenPrice'
import { AssetAccount } from './uiTypes/assets'

export type SideMode = 'Sell' | 'Buy'

export const getTokenLabels = (assetAccount: AssetAccount | null) => {
  const tokenList = tokenPriceService._tokenList
  const foundByNameToken = tokenList.find(
    (x) =>
      x.address === assetAccount?.extensions.token?.account.mint.toBase58(),
  )
  const symbol = assetAccount?.isToken
    ? foundByNameToken?.symbol ||
      (assetAccount.extensions.token &&
        abbreviateAddress(assetAccount.extensions.token.account.mint))
    : assetAccount?.isSol
    ? 'SOL'
    : ''

  const img = assetAccount?.isToken
    ? foundByNameToken?.logoURI
    : assetAccount?.isSol
    ? 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
    : ''
  const uiAmount = assetAccount?.isToken
    ? toUiDecimals(
        assetAccount.extensions.token!.account.amount,
        assetAccount.extensions.mint!.account.decimals,
      )
    : assetAccount?.isSol
    ? toUiDecimals(assetAccount.extensions.amount!, 9)
    : 0

  return { img, uiAmount, symbol }
}
