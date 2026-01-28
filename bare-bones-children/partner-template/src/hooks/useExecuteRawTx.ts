import { useCallback } from "react";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useToastActionLifecycle } from "../components/UniversalWalletModal/hooks/useToastActionLifeCycle";
import { executeTx } from "../utils/transactionUtils";
import { RawTx } from "../utils/basicWalletUtils";
import { useTxRefresh } from "../providers/TxRefreshProvider";


type RawTxBuilder<TArgs extends any[]> = (...args: TArgs) => RawTx | Promise<RawTx>;
type SuccessMessage<TArgs extends any[]> = (...args: TArgs) => string;


export function useExecuteRawTx<TArgs extends any[]>(
  buildRawTx: RawTxBuilder<TArgs>,
  successMessage: SuccessMessage<TArgs>
) {
  const { provider, account, chainId } = useWalletProvider();
  const lifecycle = useToastActionLifecycle();
  const { triggerRefresh } = useTxRefresh();

  return useCallback(
    async (...args: TArgs) => {
      if (!provider || !account || chainId == null) return;

      const tx = await executeTx(
        provider,
        async () => buildRawTx(...args),
        lifecycle,
        () => successMessage(...args)
      );

      if (tx !== undefined) {
        await tx.wait(1);
        triggerRefresh({
          hash: tx?.hash,
          message: successMessage(...args),
        });
      }

      return tx;
    },
    [provider, account, chainId, lifecycle, buildRawTx, successMessage]
  );
}
