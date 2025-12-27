import { useCallback } from "react";
import { ethers } from "ethers";
import {
  executeTx,
  TxOpts,
  wrapWithExecute,
} from "../../../utils/transactionUtils";

import { AssetType } from "../models";
import { SendCurrencyArgs, buildSendCurrencyRawTx } from "../../../utils/basicWalletUtils";

export interface WithdrawCurrencyArgs extends SendCurrencyArgs {
  tokenSymbol?: string;
}

export function useWalletWithdrawCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const withdraw = useCallback(
    async (args: WithdrawCurrencyArgs, opts?: TxOpts) => {
      const rawTx = buildSendCurrencyRawTx(args);

      const symbol = args.assetType === AssetType.NATIVE ? "Native" : args.tokenSymbol ?? "<Unknown Token>";
      const message = `Withdrawing ${args.amount} ${symbol} to ${args.recipient}`;

      executeTx(provider, wrapWithExecute(provider, diamondAddress, rawTx), opts, message);
    },
    [provider, diamondAddress]
  );

  return { withdraw };
}
