import { useCallback, useEffect, useState } from "react";
import { Contract, ethers } from "ethers";
import NamespacedCreate3FactoryAbi from "../../abis/diamond/NamespacedCreate3Factory.abi.json";
import { getBareBonesConfiguration, TEMPLATE_PROVIDER_NAMESPACES, TEMPLATE_PROVIDER_OWNER_ADDRESS } from "../../constants/misc";
import { defaultAbiCoder, keccak256 } from "ethers/lib/utils";

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
      const config = getBareBonesConfiguration(chainId);
      const factoryAddress = config.namespacedCreate3Factory;

      const factoryContract = new Contract(
        factoryAddress,
        NamespacedCreate3FactoryAbi,
        provider
      );

      const namespace = TEMPLATE_PROVIDER_NAMESPACES.SVR_TEMPLATE_PROVIDER_V1;

      const deploymentCount: number =
        await factoryContract.deploymentCount(
          walletAddress,
          keccak256(defaultAbiCoder.encode(["address", "string"],[TEMPLATE_PROVIDER_OWNER_ADDRESS, namespace]))
        );

      if (deploymentCount === 0) {
        setVaults([]);
        return;
      }

      const predictedVaults: string[] = [];

      for (let i = 0; i < deploymentCount; i++) {
        const predictedAddress =
          await factoryContract.predictAddress(
            walletAddress,
            TEMPLATE_PROVIDER_OWNER_ADDRESS,
            namespace,
            i
          );

        predictedVaults.push(predictedAddress);
      }

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
