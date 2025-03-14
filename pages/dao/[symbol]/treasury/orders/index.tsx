import PreviousRouteBtn from '@components/PreviousRouteBtn'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { AssetAccount } from '@utils/uiTypes/assets'
import { useEffect, useState } from 'react'
import GovernedAccountSelect from '../../proposal/components/GovernedAccountSelect'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import Loading from '@components/Loading'
import { ArrowsUpDownIcon } from '@heroicons/react-v2/20/solid'
import Button from '@components/Button'
import TokenBox from '@components/Orders/TokenBox'
import tokenPriceService from '@utils/services/tokenPrice'
import { USDC_MINT } from '@blockworks-foundation/mango-v4'
import { TokenInfo } from '@utils/services/types'
import Input from '@components/inputs/Input'
import Modal from '@components/Modal'
import TokenSearchBox from '@components/Orders/TokenSearchBox'
import { SideMode } from '@utils/orders'

export default function Orders() {
  const { governedTokenAccounts } = useGovernanceAssets()
  const [selectedSolWallet, setSelectedSolWallet] =
    useState<AssetAccount | null>(null)

  const wallet = useWalletOnePointOh()
  const connected = !!wallet?.connected
  const { governedTokenAccountsWithoutNfts } = useGovernanceAssets()
  const tokens = tokenPriceService._tokenList
  const usdcToken =
    tokens.find((x) => x.address === USDC_MINT.toBase58()) || null

  const [sellToken, setSellToken] = useState<null | TokenInfo>(null)
  const [sellAmount, setSellAmount] = useState('0')
  const [price, setPrice] = useState('0')
  const [buyToken, setBuyToken] = useState<null | TokenInfo>(null)
  const [buyAmount, setBuyAmount] = useState('0')
  const [sideMode, setSideMode] = useState<SideMode>('Sell')
  const [isTokenSearchOpen, setIsTokenSearchOpen] = useState(false)

  const loading = false

  useEffect(() => {
    if (!buyToken && usdcToken) {
      setBuyToken(usdcToken)
    }
  }, [buyAmount, buyToken, usdcToken])

  const proposeSwap = () => null
  const handleSwitchTokens = () => null
  const openTokenSearchBox = (mode: SideMode) => {
    setSideMode(mode)
    setIsTokenSearchOpen(true)
  }
  console.log(isTokenSearchOpen)
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
        {isTokenSearchOpen && (
          <Modal
            sizeClassName="sm:max-w-3xl"
            onClose={() => setIsTokenSearchOpen(false)}
            isOpen={isTokenSearchOpen}
          >
            <TokenSearchBox
              wallet={selectedSolWallet?.extensions.transferAddress}
              mode={sideMode}
            ></TokenSearchBox>
          </Modal>
        )}
        <div className="w-full max-w-lg">
          <div className="shared-container relative py-6 md:px-2">
            <div className="bg-bkg-2">
              <div className="px-4">
                <div>Sell</div>
                <div>
                  <TokenBox
                    onClick={() => openTokenSearchBox('Sell')}
                    img={sellToken?.logoURI}
                    symbol={sellToken?.symbol}
                  ></TokenBox>
                </div>
                <div>
                  <Input
                    label="Sell amount"
                    className="w-full min-w-full mb-3"
                    type="text"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="Sell amount"
                  />
                </div>
                <div>
                  <Input
                    label="Price per token"
                    className="w-full min-w-full mb-3"
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Price"
                  />
                </div>
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
                <div>Buy</div>
                <div>
                  <TokenBox
                    img={buyToken?.logoURI}
                    symbol={buyToken?.symbol}
                  ></TokenBox>
                </div>
                <div>
                  <Input
                    className="w-full min-w-full mb-3"
                    type="text"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="Buy amount"
                  />
                </div>
                {connected ? (
                  <Button
                    className={`mt-4 flex h-12 w-full items-center justify-center rounded-full bg-button font-bold text-button-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:hover:bg-button-hover`}
                    onClick={proposeSwap}
                  >
                    {loading ? <Loading /> : <span>Place limit order</span>}
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
