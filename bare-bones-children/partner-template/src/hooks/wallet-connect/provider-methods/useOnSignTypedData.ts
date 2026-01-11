import { useCallback } from "react";
import { _TypedDataEncoder, getAddress } from "ethers/lib/utils";
import { useWalletProvider } from "../../useWalletProvider";
import { TypedDataPayload } from "../useWalletConnectWallet";
import { isChainSupported } from "./providerUtils";
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
      const { isSupported, normalizedChain } = isChainSupported(domain.chainId)
      if(!isSupported) {
        txOpts.onWarn?.(`Signature was requested on chain: ${normalizedChain} which not supported by this dapp, 
          some dapps may improperly use the wrong chain but still work.  
          Do not sign if you think this is operation may lead to dangerous behavior`)
      }
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

