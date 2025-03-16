import { toUiDecimals } from '@blockworks-foundation/mango-v4'
import ImgWithLoader from '@components/ImgWithLoader'
import TokenIcon from '@components/treasuryV2/icons/TokenIcon'
import { abbreviateAddress } from '@utils/formatting'
import { getTokenLabels } from '@utils/orders'
import tokenPriceService from '@utils/services/tokenPrice'
import { AssetAccount } from '@utils/uiTypes/assets'

export default function TokenItem({
  assetAccount,
  selectTokenAccount,
}: {
  assetAccount: AssetAccount
  selectTokenAccount: (assetAccount: AssetAccount) => void
}) {
  const { symbol, img, uiAmount } = getTokenLabels(assetAccount)

  return (
    <div
      className="p-2 border-b flex space-x-2 last-of-type:border-none border-bkg-4 "
      onClick={() => selectTokenAccount(assetAccount)}
    >
      {!img ? (
        <TokenIcon className="h-6 w-6 stroke-white/50" />
      ) : (
        <ImgWithLoader className="w-6 h-6" src={img}></ImgWithLoader>
      )}
      <div>{symbol}</div>
      <div className="!ml-auto">{uiAmount.toFixed(4)}</div>
    </div>
  )
}
