import { useCallback } from "react";
import { TransactionRequest } from "@ethersproject/providers";
import { useWalletProvider } from "../../useWalletProvider";
import { wrapWithExecute } from "../../../utils/transactionUtils";
import { RawTx } from "../../../utils/basicWalletUtils";

export function useOnEthCall() {
  const { provider } = useWalletProvider();

  return useCallback(
    async (tx: TransactionRequest) => {
      if (!provider || !tx.from) {
        throw new Error("Provider disconnected");
      }

      // Build raw tx (same as send / estimate)
      const rawTx: RawTx = {
        to: tx.to!,
        data: tx.data ?? "0x",
        value: tx.value,
      };

      // Wrap into execute(...)
      const buildWrappedTx = wrapWithExecute(
        provider,
        tx.from,
        rawTx
      );

      const wrapped = await buildWrappedTx();

      // eth_call against wrapped tx
      return provider.call({
        to: wrapped.to,
        data: wrapped.data,
        value: wrapped.value ?? 0,
      });
    },
    [provider]
  );
}
