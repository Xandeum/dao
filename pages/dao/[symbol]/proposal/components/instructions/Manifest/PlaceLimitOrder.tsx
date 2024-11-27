/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useContext, useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import * as yup from 'yup'
import { isFormValid, validatePubkey } from '@utils/formValidation'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { Governance } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { serializeInstructionToBase64 } from '@solana/spl-governance'
import { AssetAccount } from '@utils/uiTypes/assets'
import InstructionForm, { InstructionInput } from '../FormCreator'
import { InstructionInputType } from '../inputInstructionType'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import ProgramSelector from '@components/Mango/ProgramSelector'
import useProgramSelector from '@components/Mango/useProgramSelector'
import { ManifestClient, Market } from '@cks-systems/manifest-sdk'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { useRealmProposalsQuery } from '@hooks/queries/proposal'
import tokenPriceService from '@utils/services/tokenPrice'
import { string } from 'superstruct'

interface PlaceLimitOrderForm {
  governedAccount: AssetAccount | null
  market: string
  amount: string
  price: string
  side: {
    name: string
    value: string
  }
}

const PlaceLimitOrder = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const wallet = useWalletOnePointOh()
  const connection = useLegacyConnectionContext()
  const proposals = useRealmProposalsQuery().data
  const { assetAccounts } = useGovernanceAssets()
  const [availableMarkets, setAvailableMarkets] = useState<
    {
      name: string
      value: string
      quote: string
      base: string
    }[]
  >([])
  const sideOptions = [
    {
      name: 'Buy',
      value: 'Buy',
    },
    {
      name: 'Sell',
      value: 'Sell',
    },
  ]
  const shouldBeGoverned = !!(index !== 0 && governance)
  const [form, setForm] = useState<PlaceLimitOrderForm>({
    governedAccount: null,
    market: '',
    amount: '0',
    price: '0',
    side: sideOptions[0],
  })
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const validateInstruction = async (): Promise<boolean> => {
    const { isValid, validationErrors } = await isFormValid(schema, form)
    setFormErrors(validationErrors)
    return isValid
  }
  async function getInstruction(): Promise<UiInstruction> {
    const isValid = await validateInstruction()
    let serializedInstruction = ''
    if (
      isValid &&
      form.governedAccount?.governance?.account &&
      wallet?.publicKey
    ) {
      const mClient = await ManifestClient.getClientForMarketNoPrivateKey(
        connection.current,
        PublicKey.default,
        form.governedAccount.governance.nativeTreasuryAddress
      )

      const ix = await mClient.placeOrderIx({
        numBaseTokens: Number(form.amount),
        tokenPrice: Number(form.price),
        isBid: form.side.value === 'Buy',
        lastValidSlot: 0,
        //Limit order is 0, there is import problem in sdk
        orderType: 0,
        clientOrderId: proposals!.length,
      })
      serializedInstruction = serializeInstructionToBase64(ix)
    }
    const obj: UiInstruction = {
      serializedInstruction: serializedInstruction,
      isValid,
      governance: form.governedAccount?.governance,
      customHoldUpTime: 0,
    }
    return obj
  }

  useEffect(() => {
    const getMarkets = async () => {
      const marketAccounts = await ManifestClient.getMarketProgramAccounts(
        connection.current
      )

      const markets = marketAccounts
        .map((x) =>
          Market.loadFromBuffer({
            address: x.pubkey,
            buffer: x.account.data,
          })
        )
        .sort((a, b) => Number(b.quoteVolume()) - Number(a.quoteVolume()))
        .map((x) => ({
          name: `${
            tokenPriceService.getTokenInfo(x.baseMint().toBase58())?.name
          }/${tokenPriceService.getTokenInfo(x.quoteMint().toBase58())?.name}`,
          value: x.address.toBase58(),
          quote: x.quoteMint().toBase58(),
          base: x.baseMint().toBase58(),
        }))

      setAvailableMarkets(markets)
    }
    if (connection && assetAccounts.length) {
      getMarkets()
    }
  }, [connection, assetAccounts])

  useEffect(() => {
    handleSetInstructions(
      { governedAccount: form.governedAccount?.governance, getInstruction },
      index
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [form])
  const schema = yup.object().shape({
    governedAccount: yup
      .object()
      .nullable()
      .required('Program governed account is required'),
  })
  const inputs: InstructionInput[] = [
    {
      label: 'Market',
      initialValue: form.market,
      name: 'market',
      type: InstructionInputType.SELECT,
      options: availableMarkets,
    },
    {
      label: 'Side',
      initialValue: form.side,
      name: 'side',
      type: InstructionInputType.SELECT,
      options: sideOptions,
    },
    //check quote and base
    //check sell or buy
    //validate if there is available quote or base in treasury
    {
      label: 'Governance',
      initialValue: form.governedAccount,
      name: 'governedAccount',
      type: InstructionInputType.GOVERNED_ACCOUNT,
      shouldBeGoverned: shouldBeGoverned as any,
      governance: governance,
      options: assetAccounts,
      assetType: 'token',
    },
  ]

  return (
    <>
      {form && (
        <InstructionForm
          outerForm={form}
          setForm={setForm}
          inputs={inputs}
          setFormErrors={setFormErrors}
          formErrors={formErrors}
        ></InstructionForm>
      )}
    </>
  )
}

export default PlaceLimitOrder
