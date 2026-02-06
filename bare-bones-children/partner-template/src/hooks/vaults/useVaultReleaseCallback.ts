import { ethers } from "ethers";
import { useCallback } from "react";
import { wrapWithExecute } from "../../utils/transactionUtils";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { buildVaultReleaseRawTx, VaultReleaseArgs } from "../../utils/vault/vaultInteractionTxBuilder";
import { AssetType } from "../../models/vaults/vaultTypes";

export function useVaultReleaseCallback(
  provider: ethers.providers.Web3Provider | undefined,
  vaultAddress: string,
  walletAddress: string
) {
  const buildReleaseTx = useCallback((args: VaultReleaseArgs) => {
    if (!provider) throw new Error("No provider");
    const rawTx = buildVaultReleaseRawTx(vaultAddress, args);
    return wrapWithExecute(provider, walletAddress, rawTx)();
  }, [provider, vaultAddress, walletAddress]);

  const statusMessage = useCallback((args: VaultReleaseArgs) => {
    const symbol = args.assetType === AssetType.Native ? "Native" : args.asset;
    return `Releasing ${args.amount} ${symbol} to ${args.to}`;
  }, []);

  const release = useExecuteRawTx(buildReleaseTx, statusMessage);

  return { release };
}
