import { useCallback } from "react";
import { ethers } from "ethers";
import {
  executeTx,
  TxOpts,
} from "../../../utils/transactionUtils";
import { buildSendCurrencyRawTx, SendCurrencyArgs } from "../../../utils/basicWalletUtils";
import { AssetType } from "../models";

interface DepositCurrencyArgs extends SendCurrencyArgs {
  tokenSymbol?: string;
}

export function useDepositCurrencyCallback(
  provider: ethers.providers.Web3Provider | undefined,
) {

  const deposit = useCallback(
    async (args: DepositCurrencyArgs, opts?: TxOpts) => {

      const rawTx = buildSendCurrencyRawTx({
        ...args,
      });

      const symbol = args.assetType === AssetType.NATIVE ? "Native": args.tokenSymbol ?? "<Unknown Token>";
      const message = `Depositing ${args.amount} ${symbol} → ${args.recipient}`;

      return executeTx(provider, async () => rawTx, opts, message);
    },
    [provider]
  );

  return { deposit };
}
