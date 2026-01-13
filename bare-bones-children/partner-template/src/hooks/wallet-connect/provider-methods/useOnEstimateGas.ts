import { useCallback } from "react";
import { useWalletProvider } from "../../useWalletProvider";
import { wrapWithExecute } from "../../../utils/transactionUtils";
import { TransactionRequest } from "@ethersproject/providers";
import { RawTx } from "../../../utils/basicWalletUtils";


export function useOnEstimateGas() {
  const { provider } = useWalletProvider();

  return useCallback(
    async (tx: TransactionRequest) => {
      if (!provider || !tx.from) {
        throw new Error("Provider disconnected");
      }

      const rawTx: RawTx = {
        to: tx.to!,
        data: tx.data ?? "0x",
        value: tx.value,
      };

      // wrap
      const buildWrappedTx = wrapWithExecute(
        provider,
        tx.from,
        rawTx
      );

      // 🔑 actually build the tx
      const wrappedTx = await buildWrappedTx();

      // 🔑 estimate gas on the final tx
      const gasEstimate = await provider.estimateGas({
        to: wrappedTx.to,
        data: wrappedTx.data,
        value: wrappedTx.value,
        from: tx.from,
      });

      return gasEstimate.toString();
    },
    [provider]
  );
}
