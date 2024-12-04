import { SignerWalletAdapter } from '@solana/wallet-adapter-base'
import { TransactionInstruction, Keypair, ComputeBudgetProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import {
  closeTransactionProcessUi,
  incrementProcessedTransactions,
  showTransactionError,
  showTransactionsProcessUi,
} from './transactionsLoader'

import { invalidateInstructionAccounts } from '@hooks/queries/queryClient'
import {
  sendSignAndConfirmTransactionsProps,
  sendSignAndConfirmTransactions,
  TransactionInstructionWithType,
} from '@blockworks-foundation/mangolana/lib/transactions'
import { getFeeEstimate } from '@tools/feeEstimate'
import { TransactionInstructionWithSigners } from '@blockworks-foundation/mangolana/lib/globalTypes'
import { createComputeBudgetIx } from '@blockworks-foundation/mango-v4'
import { BACKUP_CONNECTIONS } from './connection'
import { ComputeBudgetService } from './services/computeBudget'
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'

export type WalletSigner = Pick<
  SignerWalletAdapter,
  'publicKey' | 'signTransaction' | 'signAllTransactions'
>

export function getWalletPublicKey(wallet: WalletSigner) {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected!')
  }

  return wallet.publicKey
}

export enum SequenceType {
  Sequential,
  Parallel,
  StopOnFailure,
}

export const sendTransactionsV3 = async ({
  connection,
  wallet,
  transactionInstructions,
  timeoutStrategy,
  callbacks,
  config,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lookupTableAccounts,
  autoFee = true,
  // dynamicComputeUnits = true
}: sendSignAndConfirmTransactionsProps & {
  lookupTableAccounts?: any
  autoFee?: boolean
  // dynamicComputeUnits?: boolean
}) => {
  const transactionInstructionsWithFee: TransactionInstructionWithType[] = []
  const fee = await getFeeEstimate(connection)
  for (const tx of transactionInstructions) {
    if (tx.instructionsSet.length) {
      let newInstructionSet = tx.instructionsSet;
      if (autoFee) {
        newInstructionSet = [
          new TransactionInstructionWithSigners(createComputeBudgetIx(fee)),
          ...newInstructionSet
        ]
      }

      const txObjWithFee = {
        ...tx,
        instructionsSet: newInstructionSet
      }
      transactionInstructionsWithFee.push(txObjWithFee)
    }
  }

  const callbacksWithUiComponent = {
    afterBatchSign: (signedTxnsCount) => {
      if (callbacks?.afterBatchSign) {
        callbacks?.afterBatchSign(signedTxnsCount)
      }
      showTransactionsProcessUi(signedTxnsCount)
    },
    afterAllTxConfirmed: () => {
      if (callbacks?.afterAllTxConfirmed) {
        callbacks?.afterAllTxConfirmed()
      }
      closeTransactionProcessUi()
      transactionInstructionsWithFee.forEach((x) =>
        x.instructionsSet.forEach((x) =>
          invalidateInstructionAccounts(x.transactionInstruction)
        )
      )
    },
    afterEveryTxConfirmation: () => {
      if (callbacks?.afterEveryTxConfirmation) {
        callbacks?.afterEveryTxConfirmation()
      }
      incrementProcessedTransactions()
    }
  }

  const cfg = {
    maxTxesInBatch:
      transactionInstructionsWithFee.filter(
        (x) => x.sequenceType === SequenceType.Sequential
      ).length > 0
        ? 20
        : 30,
    autoRetry: false,
    maxRetries: 5,
    retried: 0,
    logFlowInfo: true,
    ...config,
  }

  const recentBlockhash = await connection.getLatestBlockhash()
  const blockhash = recentBlockhash.blockhash
  const lastValidBlockHeight = recentBlockhash.lastValidBlockHeight

  console.log(transactionInstructionsWithFee, "tx with fee")

  const txes: VersionedTransaction[] = []

  for (const tx of transactionInstructionsWithFee) {
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: tx.instructionsSet.map(o => o.transactionInstruction), // note this is an array of instructions
    }).compileToV0Message(lookupTableAccounts);

    const transactionV0 = new VersionedTransaction(messageV0);
    txes.push(transactionV0)
  }

  const signedTxs = await wallet.signAllTransactions!(txes)
  
  let finalTxSig = ""
    for (const signedTx of signedTxs) {
        let txSignature: string | null = null
        let confirmTransactionPromise:any = null
        let confirmedTx = null
    
        const signatureRaw = signedTx.signatures[0]
        txSignature = bs58.encode(signatureRaw)
        
        let txSendAttempts = 1
    
        try {
            console.log(`${new Date().toISOString()} Subscribing to transaction confirmation`);
        
            confirmTransactionPromise = connection.confirmTransaction(
                {
                    signature: txSignature,
                    blockhash,
                    lastValidBlockHeight,
                },
                "confirmed"
            );
        
            console.log(`${new Date().toISOString()} Sending Transaction ${txSignature}`);
    
            await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: false,
                maxRetries: 0,
            });
        
            confirmedTx = null
            while (!confirmedTx) {
                confirmedTx = await Promise.race([
                    confirmTransactionPromise,
                    new Promise((resolve) =>
                        setTimeout(() => {
                            resolve(null);
                        }, 30000)
                    )
                ])
    
                if (confirmedTx) {
                    break
                }
        
                console.log(`${new Date().toISOString()} Tx not confirmed after ${3000 * txSendAttempts++}ms, resending`);
        
                await connection.sendRawTransaction(signedTx.serialize(), {
                    skipPreflight: false,
                    maxRetries: 0,
                });
            }
        } catch (error) {
            console.error(error);
            throw new Error(JSON.stringify(error))
        }

        if (!confirmedTx) {
            console.log("Transaction Failed!")
            throw new Error("Transaction Failed")
        }
    
        console.log("Transaction is successful.", txSignature)
        finalTxSig = txSignature
    }

    return finalTxSig
  return
  return sendSignAndConfirmTransactions({
    connection,
    wallet,
    transactionInstructions: transactionInstructionsWithFee,
    timeoutStrategy,
    callbacks: callbacksWithUiComponent,
    config: cfg,
    confirmLevel: 'confirmed',  
    backupConnections: BACKUP_CONNECTIONS, //TODO base this on connection confirmation level
    //lookupTableAccounts,
  })
}

const getErrorMsg = (e) => {
  if (e.error) {
    return e.error
  }
  if (e.message) {
    return e.message
  }
  if (typeof e === 'object') {
    return tryStringify(e)
  }
  return `${e}`
}

const tryStringify = (obj) => {
  try {
    return JSON.stringify(obj)
  } catch {
    return null
  }
}

export const txBatchesToInstructionSetWithSigners = (
  txBatch: TransactionInstruction[],
  signerBatches: Keypair[][],
  batchIdx?: number
): { transactionInstruction: TransactionInstruction; signers: Keypair[] }[] => {
  return txBatch.map((tx, txIdx) => {
    let signers: Keypair[] = []

    if (
      typeof batchIdx !== 'undefined' &&
      signerBatches?.length &&
      signerBatches?.[batchIdx]?.[txIdx]
    ) {
      signers = [signerBatches[batchIdx][txIdx]]
    }

    return {
      transactionInstruction: tx,
      signers,
    }
  })
}
