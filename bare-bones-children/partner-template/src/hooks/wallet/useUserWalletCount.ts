import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../useWalletProvider";

import DIAMOND_FACTORY_ABI from "../../abis/diamond/DiamondFactory.abi.json";
import { getBareBonesConfiguration } from "../../constants/misc";

export function useUserWalletCount() {
  const { provider, account, chainId } = useWalletProvider();

  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const connected = !!provider && !!account && chainId != null;

  useEffect(() => {
    if (!connected) {
      setCount(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        if (chainId == null) {
          throw new Error("chainId is required");
        }

        const config = getBareBonesConfiguration(chainId);

        const factory = new ethers.Contract(
          config.diamondFactoryAddress,
          DIAMOND_FACTORY_ABI,
          provider
        );

        const nextIndex: ethers.BigNumber =
          await factory.userToNextWalletIndexMap(account);

        if (!cancelled) {
          setCount(nextIndex.toNumber());
        }
      } catch {
        if (!cancelled) {
          setCount(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [connected, provider, account, chainId]);

  return { count, loading, connected };
}
