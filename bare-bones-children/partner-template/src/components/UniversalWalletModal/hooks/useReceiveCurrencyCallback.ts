import { useCallback } from "react";
import { ethers } from "ethers";
import ERC20_ABI from "../../../abis/ERC20.json";
import { AssetType } from "../../../pages/BasicWalletFacetPage";
import {
  executeTx,
  parseNative,
  parseErc20,
  requireSigner,
  TxOpts
} from "../../../utils/transactionUtils";

interface ReceiveCurrencyArgs {
  assetType: AssetType;
  amount: string;
  decimals?: number | null;
  tokenAddress?: string;
  tokenSymbol?: string;
}

export function useReceiveCurrencyCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const receiveCurrencyCallback = useCallback(
    async (args: ReceiveCurrencyArgs, opts?: TxOpts) => {

      return executeTx(() => {
        const signer = requireSigner(provider);
        const { assetType, amount, decimals, tokenAddress, tokenSymbol } = args;

        const txSenderPromise = signer.getAddress(); 
        const symbol = assetType === AssetType.NATIVE ? 'ETH' : `${tokenSymbol ?? "???"}`
        opts?.onLog?.(`Depositing ${amount} ${symbol} → ${diamondAddress}`);

        return assetType === AssetType.NATIVE
          ? buildNativeDeposit(signer, amount, diamondAddress, txSenderPromise)
          : buildTokenDeposit(
              signer,
              tokenAddress!,
              amount,
              decimals,
              diamondAddress,
              tokenSymbol,
              txSenderPromise
            );
      }, opts);

    },
    [provider, diamondAddress]
  );

  return { receiveCurrencyCallback };
}

function buildNativeDeposit(
  signer: ethers.Signer,
  amount: string,
  diamondAddress: string,
  fromAddressPromise: Promise<string>
) {
  const value = parseNative(amount);

  return async () => {
    const userAddress = await fromAddressPromise;
    console.log(`Depositing ${amount} ETH from ${userAddress}`);

    return signer.sendTransaction({
      to: diamondAddress,
      value,
    });
  };
}


function buildTokenDeposit(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: string,
  decimals: number | null | undefined,
  diamondAddress: string,
  tokenSymbol?: string,
  fromAddressPromise?: Promise<string>
) {
  const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const amt = parseErc20(amount, decimals);

  return async () => {
    const userAddress = await fromAddressPromise;
    console.log(`Depositing ${amount} ${tokenSymbol ?? ""} from ${userAddress}`);
    return erc20.transfer(diamondAddress, amt);
  };
}
