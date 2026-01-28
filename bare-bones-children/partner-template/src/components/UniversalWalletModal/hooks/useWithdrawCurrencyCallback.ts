import { useCallback } from "react";
import { ethers } from "ethers";
import { AssetType } from "../models";
import { SendCurrencyArgs, buildSendCurrencyRawTx } from "../../../utils/basicWalletUtils";
import { wrapWithExecute } from "../../../utils/transactionUtils";
import { useExecuteRawTx } from "../../../hooks/useExecuteRawTx";

export interface WithdrawCurrencyArgs extends SendCurrencyArgs {
  tokenSymbol?: string;
}

export function useWalletWithdrawCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const buildWithdrawTx = useCallback((args: WithdrawCurrencyArgs) => {
    if (!provider) throw new Error("No provider")
    const rawTx = buildSendCurrencyRawTx(args)
    return wrapWithExecute(provider, diamondAddress, rawTx)()
  }, [provider, diamondAddress])

  const withdrawStatusMessage = useCallback((args: WithdrawCurrencyArgs) => {
    const symbol = args.assetType === AssetType.NATIVE ? "Native" : args.tokenSymbol ?? "<Unknown Token>"
    return `Withdrawing ${args.amount} ${symbol} to ${args.recipient}`
  }, [])

  const withdraw = useExecuteRawTx(buildWithdrawTx, withdrawStatusMessage)

  return { withdraw }
}
