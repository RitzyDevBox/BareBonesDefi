// hooks/useWrapCallback.ts
import { useCallback } from "react";
import { ethers } from "ethers";
import {
  executeTx,
  TxOpts,
  wrapWithExecute,
} from "../../../utils/transactionUtils";
import { buildWrapRawTx, WrapArgs, WrapMode } from "../../../utils/basicWalletUtils";


export function useWrapCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const wrap = useCallback(
    async (args: WrapArgs, opts?: TxOpts) => {
      const rawTx = buildWrapRawTx(args, WrapMode.WRAP);
      const message = `Wrapping ${args.amount} ETH → WETH`;

      executeTx(
        provider,
        wrapWithExecute(provider, diamondAddress, rawTx),
        opts,
        () => message
      );
    },
    [provider, diamondAddress]
  );

  return { wrap };
}

export function useUnwrapCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const unwrap = useCallback(
    async (args: WrapArgs, opts?: TxOpts) => {
      const rawTx = buildWrapRawTx(args, WrapMode.UNWRAP);
      const message = `Unwrapping ${args.amount} WETH → ETH`;

      executeTx(
        provider,
        wrapWithExecute(provider, diamondAddress, rawTx),
        opts,
        () => message
      );
    },
    [provider, diamondAddress]
  );

  return { unwrap };
}
