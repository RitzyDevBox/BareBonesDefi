import { useCallback } from "react";
import { TransactionRequest } from "@ethersproject/providers";
import { RawTx } from "../../../utils/basicWalletUtils";
import { wrapWithExecute } from "../../../utils/transactionUtils";
import { useWalletProvider } from "../../useWalletProvider";
import { useExecuteRawTx } from "../../../hooks/useExecuteRawTx";

export function useOnSendTransaction() {
  const { provider } = useWalletProvider();

  const buildSendTx = useCallback((tx: TransactionRequest) => {
    if (!provider || !tx.from) throw new Error("Provider disconnected");

    // Note: We'd like to validate the chain but tx's prior to EIP-1559 don't contain chain data
    // We had to spoof support for chainId 1 since uniswap and other websites require it
    // however at the moment we don't support it so if they attempt to perorm a transaction 
    // on that chain then we should throw an error.
    // validateChainSupported(tx.chainId);
    const rawTx: RawTx = {
      to: tx.to!,
      data: tx.data ?? "0x",
      value: tx.value,
    };

    return wrapWithExecute(provider, tx.from, rawTx)();
  }, [provider]);

  const sendStatusMessage = useCallback(() => `WalletConnect transaction`, []);

  const sendTx = useExecuteRawTx(buildSendTx, sendStatusMessage);

  return useCallback(async (tx: TransactionRequest) => {
    const receipt = await sendTx(tx);
    if (!receipt) throw new Error("Transaction produced no receipt");
    return receipt.hash;
  }, [sendTx]);
}
