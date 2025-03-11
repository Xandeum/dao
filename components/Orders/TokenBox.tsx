import { ArrowDown } from '@carbon/icons-react'
import ImgWithLoader from '@components/ImgWithLoader'
import TokenIcon from '@components/treasuryV2/icons/TokenIcon'

export default function TokenBox({ img, symbol }) {
  return (
    <div className="flex items-center border border-bkg-4 p-3 my-3 rounded">
      <>
        <div className="mr-3">
          {!img ? (
            <TokenIcon className="h-10 w-10 stroke-white/50" />
          ) : (
            <ImgWithLoader className="w-6 h-6" src={img}></ImgWithLoader>
          )}
        </div>
        <div className="text-xs">{symbol ? symbol : 'No token selected'}</div>
        <div className="ml-auto">
          <ArrowDown></ArrowDown>
        </div>
      </>
    </div>
  )
}
