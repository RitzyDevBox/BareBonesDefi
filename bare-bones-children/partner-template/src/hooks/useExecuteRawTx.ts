import { useCallback } from "react";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useToastActionLifecycle } from "../components/UniversalWalletModal/hooks/useToastActionLifeCycle";
import { executeTx } from "../utils/transactionUtils";
import { RawTx } from "../utils/basicWalletUtils";


type RawTxBuilder<TArgs extends any[]> = (...args: TArgs) => RawTx;
type SuccessMessage<TArgs extends any[]> = (...args: TArgs) => string;

export function useExecuteRawTx<TArgs extends any[]>(
  buildRawTx: RawTxBuilder<TArgs>,
  successMessage: SuccessMessage<TArgs>
) {
  const { provider, account, chainId } = useWalletProvider();
  const lifecycle = useToastActionLifecycle();

  return useCallback(
    async (...args: TArgs) => {
      if (!provider || !account || chainId == null) return;

      return await executeTx(
        provider,
        async () => buildRawTx(...args),
        lifecycle,
        () => successMessage(...args)
      );
    },
    [provider, account, chainId, lifecycle, buildRawTx, successMessage]
  );
}
