import PreviousRouteBtn from '@components/PreviousRouteBtn'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { AssetAccount } from '@utils/uiTypes/assets'
import { useState } from 'react'
import GovernedAccountSelect from '../../proposal/components/GovernedAccountSelect'

export default function Orders() {
  const { governedTokenAccounts } = useGovernanceAssets()
  const [selectedSolWallet, setSelectedSolWallet] =
    useState<AssetAccount | null>(null)
  return (
    <div className="rounded-lg bg-bkg-2 p-6 min-h-full flex flex-col">
      <header className="space-y-6 border-b border-white/10 pb-4">
        <PreviousRouteBtn />
      </header>
      <article className="grid grid-cols-[458px_1fr] flex-grow gap-x-4">
        <GovernedAccountSelect
          label={'Wallet'}
          governedAccounts={governedTokenAccounts.filter((x) => x.isSol)}
          onChange={(value: AssetAccount) => setSelectedSolWallet(value)}
          value={selectedSolWallet}
          governance={selectedSolWallet?.governance}
          type="wallet"
        />
      </article>
    </div>
  )
}
