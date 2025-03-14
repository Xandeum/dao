import { toUiDecimals } from '@blockworks-foundation/mango-v4'
import ImgWithLoader from '@components/ImgWithLoader'
import TokenIcon from '@components/treasuryV2/icons/TokenIcon'
import { abbreviateAddress } from '@utils/formatting'
import tokenPriceService from '@utils/services/tokenPrice'
import { AssetAccount } from '@utils/uiTypes/assets'

export default function TokenItem({
  assetAccount,
}: {
  assetAccount: AssetAccount
}) {
  const tokenList = tokenPriceService._tokenList
  const foundByNameToken = tokenList.find(
    (x) => x.address === assetAccount.extensions.token?.account.mint.toBase58(),
  )
  const symbol =
    foundByNameToken?.symbol ||
    (assetAccount.extensions.token &&
      abbreviateAddress(assetAccount.extensions.token.account.mint))
  const img = foundByNameToken?.logoURI
  const uiAmount =
    (assetAccount.extensions.token &&
      assetAccount.extensions.mint &&
      toUiDecimals(
        assetAccount.extensions.token?.account.amount,
        assetAccount.extensions.mint?.account.decimals,
      )) ||
    0
  return (
    <div className="p-2 border-b flex space-x-2">
      {!img ? (
        <TokenIcon className="h-6 w-6 stroke-white/50" />
      ) : (
        <ImgWithLoader className="w-6 h-6" src={img}></ImgWithLoader>
      )}
      <div>{symbol}</div>
      <div className="!ml-auto">{uiAmount}</div>
    </div>
  )
}
