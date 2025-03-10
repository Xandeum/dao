import PreviousRouteBtn from '@components/PreviousRouteBtn'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { AssetAccount } from '@utils/uiTypes/assets'
import { useState } from 'react'
import GovernedAccountSelect from '../../proposal/components/GovernedAccountSelect'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import Loading from '@components/Loading'
import { ArrowsUpDownIcon } from '@heroicons/react-v2/20/solid'
import Button from '@components/Button'

export default function Orders() {
  const { governedTokenAccounts } = useGovernanceAssets()
  const [selectedSolWallet, setSelectedSolWallet] =
    useState<AssetAccount | null>(null)
  const wallet = useWalletOnePointOh()
  const connected = !!wallet?.connected

  const loading = false
  const proposeSwap = () => null
  const handleSwitchTokens = () => null
  return (
    <div className="rounded-lg bg-bkg-2 p-6 min-h-full flex flex-col">
      <header className="space-y-6 border-b border-white/10 pb-4">
        <PreviousRouteBtn />
      </header>
      <div className="gap-x-4 mb-4">
        <GovernedAccountSelect
          label={'Wallet'}
          governedAccounts={governedTokenAccounts.filter((x) => x.isSol)}
          onChange={(value: AssetAccount) => setSelectedSolWallet(value)}
          value={selectedSolWallet}
          governance={selectedSolWallet?.governance}
          type="wallet"
        />
      </div>
      <div className="flex flex-col items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="shared-container relative py-6 md:px-2">
            <div className="bg-bkg-2">
              <div className="px-4">
                <div>Input sell</div>
                <div className="flex items-center">
                  <div className="h-px w-full bg-bkg-4" />
                  <Button
                    className="flex shrink-0 items-center justify-center rounded-full border border-bkg-4 bg-bkg-2"
                    onClick={() => handleSwitchTokens()}
                  >
                    <ArrowsUpDownIcon className="w-4 h-4 text-button-text" />
                  </Button>
                  <div className="h-px w-full bg-bkg-4" />
                </div>
                <div>Input buy</div>
                {connected ? (
                  <Button
                    className={`mt-4 flex h-12 w-full items-center justify-center rounded-full bg-button font-bold text-button-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:hover:bg-button-hover`}
                    onClick={proposeSwap}
                  >
                    {loading ? <Loading /> : <span>Swap</span>}
                  </Button>
                ) : (
                  <Button
                    className={`mt-4 flex h-12 w-full items-center justify-center rounded-full bg-button font-bold text-button-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:hover:bg-button-hover`}
                    disabled={true}
                  >
                    <span>Please connect wallet</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
