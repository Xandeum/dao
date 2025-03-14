import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { PublicKey } from '@solana/web3.js'
import { SideMode } from '@utils/orders'
import TokenItem from './TokenItem'

export default function TokenSearchBox({
  mode,
  wallet,
}: {
  mode: SideMode
  wallet?: PublicKey
}) {
  const { governedTokenAccountsWithoutNfts } = useGovernanceAssets()

  const availableTokenAccounts =
    governedTokenAccountsWithoutNfts?.filter(
      (x) => wallet && x.extensions.token?.account.owner.equals(wallet),
    ) || []

  return (
    <div className="flex items-center border border-bkg-4 p-3 my-3 rounded">
      <div className="flex flex-col overflow-auto  max-h-[500px] w-full">
        {availableTokenAccounts.map((acc) => (
          <TokenItem key={acc.pubkey.toBase58()} assetAccount={acc}></TokenItem>
        ))}
      </div>
    </div>
  )
}
