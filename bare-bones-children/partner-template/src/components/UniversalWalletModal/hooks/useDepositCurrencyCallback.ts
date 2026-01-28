import { useCallback } from "react";
import { ethers } from "ethers";
import { buildSendCurrencyRawTx, SendCurrencyArgs } from "../../../utils/basicWalletUtils";
import { AssetType } from "../models";
import { useExecuteRawTx } from "../../../hooks/useExecuteRawTx";

interface DepositCurrencyArgs extends SendCurrencyArgs {
  tokenSymbol?: string;
}

export function useDepositCurrencyCallback(_provider: ethers.providers.Web3Provider | undefined) {
  const buildDepositTx = useCallback((args: DepositCurrencyArgs) => {
    return buildSendCurrencyRawTx({ ...args });
  }, []);

  const depositStatusMessage = useCallback((args: DepositCurrencyArgs) => {
    const symbol = args.assetType === AssetType.NATIVE ? "Native" : args.tokenSymbol ?? "<Unknown Token>";
    return `Depositing ${args.amount} ${symbol} → ${args.recipient}`;
  }, []);

  const deposit = useExecuteRawTx(buildDepositTx, depositStatusMessage);

  return { deposit };
}
