// hooks/vaults/useDeployVault.ts
import { useCallback } from "react";
import { ethers } from "ethers";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { buildDeployVaultRawTx } from "../../utils/vault/buildDeployVaultRawTx";

interface DeployVaultArgs {
  walletAddress: string;
  constructorParams: string; // bytes
}

export function useDeployVault(
  provider: ethers.providers.Web3Provider | undefined,
  chainId: number | null
) {
  const buildDeployTx = useCallback(
    (args: DeployVaultArgs) => {
      if (!chainId) {
        throw new Error("Missing chainId");
      }

      return buildDeployVaultRawTx({
        chainId,
        walletAddress: args.walletAddress,
        constructorParams: args.constructorParams,
      });
    },
    [chainId]
  );

  const statusMessage = useCallback(
    (args: DeployVaultArgs) =>
      `Deploying vault for wallet ${args.walletAddress}`,
    []
  );

  const deployVault = useExecuteRawTx(buildDeployTx, statusMessage);

  return { deployVault };
}
