import { useCallback } from "react";
import { ethers } from "ethers";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { wrapWithExecute } from "../../utils/transactionUtils";
import { buildDeployVaultRawTx } from "../../utils/vault/buildDeployVaultRawTx";

interface DeployVaultArgs {
  walletAddress: string;
  constructorParams: string; // bytes
}

export function useDeployVault(
  provider: ethers.providers.Web3Provider | undefined,
  chainId: number | null
) {
  const buildDeployVaultTx = useCallback(
    (args: DeployVaultArgs) => {
      if (!provider) throw new Error("No provider");
      if (!chainId) throw new Error("Missing chainId");

      const rawTx = buildDeployVaultRawTx({
        chainId,
        walletAddress: args.walletAddress,
        constructorParams: args.constructorParams,
      });

      // IMPORTANT: return the wrapped callback, not its execution
      return wrapWithExecute(
        provider,
        args.walletAddress,
        rawTx
      )();
    },
    [provider, chainId]
  );

  const deployVaultStatusMessage = useCallback(
    (args: DeployVaultArgs) =>
      `Deploying vault for wallet ${args.walletAddress}`,
    []
  );

  const deployVault = useExecuteRawTx(
    buildDeployVaultTx,
    deployVaultStatusMessage
  );

  return { deployVault };
}
