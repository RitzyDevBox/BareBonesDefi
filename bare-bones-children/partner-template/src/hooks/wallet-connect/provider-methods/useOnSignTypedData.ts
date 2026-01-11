import { useCallback } from "react";
import { _TypedDataEncoder, getAddress } from "ethers/lib/utils";
import { useWalletProvider } from "../../useWalletProvider";
import { TypedDataPayload } from "../useWalletConnectWallet";
import { validateChainSupported } from "./providerUtils";
import { useToastActionLifecycle } from "../../../components/UniversalWalletModal/hooks/useToastActionLifeCycle";

export function useOnSignTypedData(walletAddress: string | null) {
  const { provider, chainId, account } = useWalletProvider();
  const txOpts = useToastActionLifecycle()

  return useCallback(async (user: string, payload: TypedDataPayload) => {
    if (!provider || !chainId || !account || !walletAddress) {
      throw new Error("Wallet not ready");
    }

    try {

      if(getAddress(user) != getAddress(walletAddress)) {
        throw new Error("Third party requested a signature that does not match the connected wallet")
      }

      const { domain } = payload;
      validateChainSupported(domain.chainId);
      return await provider.send("eth_signTypedData_v4", [
        account,
        JSON.stringify(payload)
      ]);

    } catch(err) {
      txOpts.onError?.(err)
      console.log(err)
    }

  }, [provider, chainId, walletAddress]);
}

