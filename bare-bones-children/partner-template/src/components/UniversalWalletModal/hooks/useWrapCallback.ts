import { useCallback } from "react";
import { ethers } from "ethers";
import BASIC_WALLET_FACET_ABI from "../../../abis/diamond/facets/basicWalletFacet.abi.json";
import { executeTx, parseNative, requireSigner, TxOpts } from "../../../utils/transactionUtils";

export enum WrapMode {
  WRAP = "WRAP",
  UNWRAP = "UNWRAP",
}

export interface WrapArgs {
  amount: string;       // "1.0"
  wethAddress: string;  // 0xWETH
}

function useWrapInternal(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string,
  mode: WrapMode
) {
  return useCallback(
    async (args: WrapArgs, opts?: TxOpts) => {
      return executeTx(() => {
        const signer = requireSigner(provider);
        const contract = new ethers.Contract(diamondAddress, BASIC_WALLET_FACET_ABI, signer);

        const { amount, wethAddress } = args;
        const value = parseNative(amount);

        // Logs
        if (mode === WrapMode.WRAP) {
          opts?.onLog?.(`Wrapping ${amount} ETH → WETH`);
        } else {
          opts?.onLog?.(`Unwrapping ${amount} WETH → ETH`);
        }

        // Build tx
        return mode === WrapMode.WRAP
          ? () => contract.wrapETH(wethAddress, value)
          : () => contract.unwrapETH(wethAddress, value);

      }, opts);
    },
    [provider, diamondAddress, mode]
  );
}

/**
 * PUBLIC HOOKS
 */
export function useWrapCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const wrap = useWrapInternal(provider, diamondAddress, WrapMode.WRAP);
  return { wrapCallback: wrap };
}

export function useUnwrapCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const unwrap = useWrapInternal(provider, diamondAddress, WrapMode.UNWRAP);
  return { unwrapCallback: unwrap };
}
