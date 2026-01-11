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