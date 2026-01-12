import { useCallback } from "react";
import { useToastActionLifecycle } from "../../../components/UniversalWalletModal/hooks/useToastActionLifeCycle";
import { useWalletProvider } from "../../useWalletProvider";
import { executeTx, wrapWithExecute } from "../../../utils/transactionUtils";
import { TransactionRequest } from "@ethersproject/providers";

export function useOnSendTransaction() {
    const { provider } = useWalletProvider()
    const txOpts = useToastActionLifecycle()
    
    return useCallback(async (tx: TransactionRequest) => {
        if (!provider || !tx.from) throw new Error("Provider disconnected");
        
        // Note: We'd like to validate the chain but tx's prior to EIP-1559 don't contain chain data
        // We had to spoof support for chainId 1 since uniswap and other websites require it
        // however at the moment we don't support it so if they attempt to perorm a transaction 
        // on that chain then we should throw an error.
        // validateChainSupported(tx.chainId);
        const rawTx = {
            to: tx.to!,
            data: tx.data ?? "0x",
            value: tx.value,
        };

        const message = `WalletConnect transaction`;
        const reciept = await executeTx(
            provider,
            wrapWithExecute(provider, tx.from, rawTx),
            txOpts,
            () => message
        );

        if(!reciept) {
            throw Error("Transaction produced no reciept");
        }

        return reciept.hash
    }, [provider, txOpts])
}