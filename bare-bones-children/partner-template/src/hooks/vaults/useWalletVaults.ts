import { useCallback, useEffect, useState } from "react";
import { Contract, ethers } from "ethers";
import NamespacedCreate3FactoryAbi from "../../abis/diamond/NamespacedCreate3Factory.abi.json";
import {
  getBareBonesConfiguration,
  getSvrTemplateDeploymentConfig,
} from "../../constants/misc";
import { defaultAbiCoder, keccak256 } from "ethers/lib/utils";

export async function fetchWalletVaultAddresses(
  provider: ethers.providers.Web3Provider,
  chainId: number,
  walletAddress: string
): Promise<string[]> {
  const config = getBareBonesConfiguration(chainId);
  const factoryAddress = config.namespacedCreate3Factory;
  const templateConfig = getSvrTemplateDeploymentConfig(chainId);

  const factoryContract = new Contract(
    factoryAddress,
    NamespacedCreate3FactoryAbi,
    provider
  );

  const namespace = templateConfig.svrTemplateName;

  const deploymentCount: number = await factoryContract.deploymentCount(
    walletAddress,
    keccak256(defaultAbiCoder.encode(["address", "string"], [templateConfig.templateOwnerAddress, namespace]))
  );

  if (deploymentCount === 0) {
    return [];
  }

  const predictedVaults: string[] = [];

  for (let i = 0; i < deploymentCount; i++) {
    const predictedAddress = await factoryContract.predictAddress(
      walletAddress,
      templateConfig.templateOwnerAddress,
      namespace,
      i
    );

    predictedVaults.push(predictedAddress);
  }

  return predictedVaults;
}

export function useWalletVaults(
  provider: ethers.providers.Web3Provider | null | undefined,
  chainId: number | null,
  walletAddress: string | null
) {
  const [vaults, setVaults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const hasVaults = vaults.length > 0;

  const refreshVaults = useCallback(async () => {
    if (!provider || !chainId || !walletAddress) return;

    setLoading(true);

    try {
      const predictedVaults = await fetchWalletVaultAddresses(provider, chainId, walletAddress);
      setVaults(predictedVaults);
    } catch (err) {
      console.error("Failed to load vaults", err);
      setVaults([]);
    } finally {
      setLoading(false);
    }
  }, [provider, chainId, walletAddress]);

  useEffect(() => {
    refreshVaults();
  }, [refreshVaults]);

  return {
    vaults,
    loading,
    hasVaults,
    refreshVaults
  };
}
