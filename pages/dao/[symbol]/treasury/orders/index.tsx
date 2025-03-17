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
import { toNative, USDC_MINT } from '@blockworks-foundation/mango-v4'
import { TokenInfo } from '@utils/services/types'
import Input from '@components/inputs/Input'
import Modal from '@components/Modal'
import TokenSearchBox from '@components/Orders/TokenSearchBox'
import {
  FEE_WALLET,
  getTokenLabels,
  SideMode,
  tryGetNumber,
} from '@utils/orders'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import { Market, UiWrapper } from '@cks-systems/manifest-sdk'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token-new'
import {
  serializeInstructionToBase64,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-governance'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'

export default function Orders() {
  const { governedTokenAccounts } = useGovernanceAssets()
  const [selectedSolWallet, setSelectedSolWallet] =
    useState<AssetAccount | null>(null)
  const connection = useLegacyConnectionContext()

  const wallet = useWalletOnePointOh()
  const connected = !!wallet?.connected

  const tokens = tokenPriceService._tokenList
  const usdcToken =
    tokens.find((x) => x.address === USDC_MINT.toBase58()) || null

  const [sellToken, setSellToken] = useState<null | AssetAccount>(null)
  const [sellAmount, setSellAmount] = useState('0')
  const [price, setPrice] = useState('0')
  const [buyToken, setBuyToken] = useState<null | TokenInfo>(null)
  const [buyAmount, setBuyAmount] = useState('0')
  const [sideMode, setSideMode] = useState<SideMode>('Sell')
  const [isTokenSearchOpen, setIsTokenSearchOpen] = useState(false)

  const { symbol, img, uiAmount } = getTokenLabels(sellToken)

  const loading = false

  useEffect(() => {
    if (!buyToken && usdcToken) {
      setBuyToken(usdcToken)
    }
  }, [buyAmount, buyToken, usdcToken])

  useEffect(() => {
    if (sellToken?.extensions.mint?.publicKey) {
      const price = tokenPriceService.getUSDTokenPrice(
        sellToken?.extensions.mint?.publicKey.toBase58(),
      )
      setPrice(price.toString())
    }
  }, [sellToken?.extensions.mint])

  useEffect(() => {
    if (tryGetNumber(sellAmount) && tryGetNumber(price)) {
      setBuyAmount((Number(sellAmount) * Number(price)).toString())
    }
  }, [sellAmount, price])

  useEffect(() => {
    if (
      governedTokenAccounts.filter((x) => x.isSol)?.length &&
      !selectedSolWallet
    ) {
      setSelectedSolWallet(governedTokenAccounts.filter((x) => x.isSol)[0])
    }
  }, [governedTokenAccounts, selectedSolWallet])

  const proposeSwap = async () => {
    const ixes: (
      | string
      | {
          serializedInstruction: string
          holdUpTime: number
        }
    )[] = []
    const signers: Keypair[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []
    if (selectedSolWallet && sellToken && wallet?.publicKey) {
      const orderId = Date.now()
      const isBid = sideMode === 'Buy'

      const owner = sellToken.isSol
        ? sellToken.extensions.transferAddress!
        : sellToken.extensions.token!.account.owner

      const wrapper = await UiWrapper.fetchFirstUserWrapper(
        connection.current,
        owner,
      )

      const market = (
        await Market.findByMints(
          connection.current,
          sellToken.extensions.mint!.publicKey!,
          new PublicKey(buyToken!.address),
        )
      )[0]
      const quoteMint = market!.quoteMint()
      const baseMint = market!.baseMint()
      let wrapperPk = wrapper?.pubkey

      const needToCreateWSolAcc =
        baseMint.equals(WRAPPED_SOL_MINT) || quoteMint.equals(WRAPPED_SOL_MINT)

      if (needToCreateWSolAcc) {
        const wsolAta = getAssociatedTokenAddressSync(
          WRAPPED_SOL_MINT,
          owner,
          true,
        )
        const createPayerAtaIx =
          createAssociatedTokenAccountIdempotentInstruction(
            owner,
            wsolAta,
            owner,
            WRAPPED_SOL_MINT,
          )
        const solTransferIx = SystemProgram.transfer({
          fromPubkey: owner,
          toPubkey: wsolAta,
          lamports: toNative(Number(sellAmount), 9).toNumber(),
        })

        const syncNative = createSyncNativeInstruction(wsolAta)
        ixes.push(
          serializeInstructionToBase64(createPayerAtaIx),
          serializeInstructionToBase64(solTransferIx),
          serializeInstructionToBase64(syncNative),
        )
      }

      if (!wrapperPk) {
        const setup = await UiWrapper.setupIxs(
          connection.current,
          owner,
          wallet.publicKey,
        )
        wrapperPk = setup.signers[0].publicKey

        prerequisiteInstructions.push(...setup.ixs)
        signers.push(
          ...setup.signers.map((x) => Keypair.fromSecretKey(x.secretKey)),
        )
      }
      const placeIx = await UiWrapper['placeIx_'](
        market,
        {
          wrapper: wrapperPk!,
          owner,
          payer: owner,
          baseTokenProgram: TOKEN_PROGRAM_ID,
          quoteTokenProgram: TOKEN_PROGRAM_ID,
        },
        {
          isBid: isBid,
          amount: Number(sellAmount),
          price: Number(price),
          orderId: orderId,
        },
      )
      ixes.push(...placeIx.ixs.map((x) => serializeInstructionToBase64(x)))

      const traderTokenAccountBase = getAssociatedTokenAddressSync(
        baseMint,
        owner,
        true,
        TOKEN_PROGRAM_ID,
      )
      const traderTokenAccountQuote = getAssociatedTokenAddressSync(
        quoteMint,
        owner,
        true,
        TOKEN_PROGRAM_ID,
      )
      const platformAta = getAssociatedTokenAddressSync(
        quoteMint,
        FEE_WALLET,
        true,
        TOKEN_PROGRAM_ID,
      )

      const [platformAtaAccount, baseAtaAccount, quoteAtaAccount] =
        await Promise.all([
          connection.current.getAccountInfo(platformAta),
          connection.current.getAccountInfo(traderTokenAccountBase),
          connection.current.getAccountInfo(traderTokenAccountQuote),
        ])

      const doesPlatformAtaExists =
        platformAtaAccount && platformAtaAccount?.lamports > 0
      const doesTheBaseAtaExisits =
        baseAtaAccount && baseAtaAccount?.lamports > 0
      const doesTheQuoteAtaExisits =
        quoteAtaAccount && quoteAtaAccount?.lamports > 0

      if (!doesPlatformAtaExists) {
        const platformAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            platformAta,
            FEE_WALLET,
            quoteMint,
            TOKEN_PROGRAM_ID,
          )
        prerequisiteInstructions.push(platformAtaCreateIx)
      }
      if (!doesTheQuoteAtaExisits) {
        const quoteAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            traderTokenAccountQuote,
            owner,
            quoteMint,
            TOKEN_PROGRAM_ID,
          )
        prerequisiteInstructions.push(quoteAtaCreateIx)
      }
      if (!doesTheBaseAtaExisits) {
        const baseAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            traderTokenAccountBase,
            owner,
            baseMint,
            TOKEN_PROGRAM_ID,
          )
        prerequisiteInstructions.push(baseAtaCreateIx)
      }
    }
    const obj: UiInstruction = {
      serializedInstruction: '',
      additionalSerializedInstructions: ixes,
      prerequisiteInstructions: prerequisiteInstructions,
      prerequisiteInstructionsSigners: signers,
      isValid: true,
      governance: selectedSolWallet?.governance,
      customHoldUpTime: 0,
      chunkBy: 1,
    }
    console.log(obj)
  }
  const handleSwitchSides = () => null
  const openTokenSearchBox = (mode: SideMode) => {
    setSideMode(mode)
    setIsTokenSearchOpen(true)
  }

  return (
    <div
      className={`rounded-lg bg-bkg-2 p-6 min-h-full flex flex-col ${
        !selectedSolWallet ? 'pointer-events-none' : ''
      }`}
    >
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
              selectTokenAccount={(assetAccount) => {
                setSellToken(assetAccount)
                setIsTokenSearchOpen(false)
              }}
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
                    img={img}
                    symbol={symbol}
                    uiAmount={uiAmount}
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
                    onClick={() => handleSwitchSides()}
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
