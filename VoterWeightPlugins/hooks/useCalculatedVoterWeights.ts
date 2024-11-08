import { ProgramAccount, TokenOwnerRecord } from '@solana/spl-governance'
import {
  CalculatedWeight,
  UseVoterWeightPluginsArgs,
  VoterWeightPluginInfo,
} from '../lib/types'
import { calculateVoterWeight } from '../lib/calculateVoterWeights'
import {PublicKey} from "@solana/web3.js";
import { useQuery } from '@tanstack/react-query';

type Args = UseVoterWeightPluginsArgs & {
  realmPublicKey?: PublicKey
  governanceMintPublicKey?: PublicKey
  walletPublicKeys?: PublicKey[]
  plugins?: VoterWeightPluginInfo[]
  tokenOwnerRecords?: ProgramAccount<TokenOwnerRecord>[]
}

const argsAreSet = (args: Args): args is Required<Args> =>
    args.realmPublicKey !== undefined && args.governanceMintPublicKey !== undefined && args.walletPublicKeys !== undefined &&
    args.plugins !== undefined && args.tokenOwnerRecords !== undefined

export function useCalculatedVoterWeights(args: Args) {
    return useQuery({
        queryKey: ['calculate-voter-weight', {
            realmPublicKey: args.realmPublicKey,
            governanceMintPublicKey: args.governanceMintPublicKey,
            walletPublicKeys: args.walletPublicKeys?.map(k => k.toBase58())
        }],
        queryFn: async () => {
            if (!argsAreSet(args)) return undefined;

            const voterWeights = args.walletPublicKeys?.map(wallet => {
                const tokenOwnerRecord = args.tokenOwnerRecords?.find(tor => tor.account.governingTokenOwner.equals(wallet));
                return calculateVoterWeight({
                    ...args as Required<Args>,
                    walletPublicKey: wallet,
                    tokenOwnerRecord,
                });
            });
            return Promise.all(voterWeights);
        }
    })
}