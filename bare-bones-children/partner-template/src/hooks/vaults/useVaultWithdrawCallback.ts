import { ethers } from "ethers";
import { useCallback } from "react";
import { wrapWithExecute } from "../../utils/transactionUtils";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { buildVaultWithdrawRawTx, VaultWithdrawArgs } from "../../utils/vault/vaultInteractionTxBuilder";
import { AssetType } from "../../models/vaults/vaultTypes";

export function useVaultWithdrawCallback(
  provider: ethers.providers.Web3Provider | undefined,
  vaultAddress: string,
  walletAddress: string
) {
  const buildWithdrawTx = useCallback((args: VaultWithdrawArgs) => {
    if (!provider) throw new Error("No provider");
    const rawTx = buildVaultWithdrawRawTx(vaultAddress, args);
    return wrapWithExecute(provider, walletAddress, rawTx)();
  }, [provider, vaultAddress, walletAddress]);

  const statusMessage = useCallback((args: VaultWithdrawArgs) => {
    const symbol = args.assetType === AssetType.Native ? "Native" : args.asset;
    return `Withdrawing ${args.amount} ${symbol} from vault`;
  }, []);

  const withdraw = useExecuteRawTx(buildWithdrawTx, statusMessage);

  return { withdraw };
}
