// hooks/useWrapCallback.ts
import { useCallback } from "react";
import { ethers } from "ethers";
import { wrapWithExecute } from "../../../utils/transactionUtils";
import { buildWrapRawTx, WrapArgs, WrapMode } from "../../../utils/basicWalletUtils";
import { useExecuteRawTx } from "../../../hooks/useExecuteRawTx";

export function useWrapCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const buildWrapTx = useCallback(async (args: WrapArgs) => {
    if (!provider) throw new Error("No provider")
    const rawTx = buildWrapRawTx(args, WrapMode.WRAP)
    return await wrapWithExecute(provider, diamondAddress, rawTx)()
  }, [provider, diamondAddress])

  const wrapStatusMessage = useCallback((args: WrapArgs) => `Wrapping ${args.amount} ETH → WETH`, [])

  const wrap = useExecuteRawTx(buildWrapTx, wrapStatusMessage)

  return { wrap }
}

export function useUnwrapCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const buildUnwrapTx = useCallback((args: WrapArgs) => {
    if (!provider) throw new Error("No provider")
    const rawTx = buildWrapRawTx(args, WrapMode.UNWRAP)
    return wrapWithExecute(provider, diamondAddress, rawTx)()
  }, [provider, diamondAddress])

  const unwrapStatusMessage = useCallback((args: WrapArgs) => `Unwrapping ${args.amount} WETH → ETH`, [])
  const unwrap = useExecuteRawTx(buildUnwrapTx, unwrapStatusMessage)

  return { unwrap }
}
