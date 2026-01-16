import { useCallback } from "react";
import { useWalletProvider } from "../../useWalletProvider";

export function useOnBlockNumber() {
  const { provider } = useWalletProvider();

  return useCallback(async () => {
    if (!provider) {
      throw new Error("Provider disconnected");
    }

    return await provider.getBlockNumber();
  }, [provider]);
}
