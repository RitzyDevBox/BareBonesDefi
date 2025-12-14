import { useCallback } from "react";
import { ethers } from "ethers";
import BASIC_WALLET_FACET_ABI from "../../../abis/diamond/facets/basicWalletFacet.abi.json";
import { executeTx, parseErc20, parseNative, requireSigner, TxOpts } from "../../../utils/transactionUtils";
import { AssetType } from "../models";

interface SendCurrencyArgs {
  assetType: AssetType;
  amount: string;
  recipient: string;
  decimals?: number | null;
  tokenSymbol?: string;
  tokenAddress?: string;
}



export function useSendCurrencyCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const sendCurrencyCallback = useCallback(
    async (args: SendCurrencyArgs, opts?: TxOpts) => {
      return executeTx(() => {
        const signer = requireSigner(provider); // ❗ can throw
        const contract = new ethers.Contract(diamondAddress, BASIC_WALLET_FACET_ABI, signer);

        const { assetType, amount, recipient, decimals, tokenAddress, tokenSymbol } = args;

        const symbol = assetType === AssetType.NATIVE ? 'ETH' : `${tokenSymbol ?? "???"}`
        opts?.onLog?.(`Withdrawing ${amount} ${symbol} to ${recipient}`);
        
        return assetType === AssetType.NATIVE
          ? buildNativeSend(contract, amount, recipient)
          : buildTokenSend(contract, tokenAddress!, amount, recipient, decimals);
      }, opts);
    },
    [provider, diamondAddress]
  );

  return { sendCurrencyCallback };
}

function buildNativeSend(contract: ethers.Contract, amount: string, recipient: string) {
  const value = parseNative(amount);
  return () => contract.sendETH(recipient, value);
}

function buildTokenSend(
  contract: ethers.Contract,
  tokenAddress: string,
  amount: string,
  recipient: string,
  decimals?: number | null
) {
  const amt = parseErc20(amount, decimals);
  return () => contract.sendERC20(tokenAddress, recipient, amt);
}
