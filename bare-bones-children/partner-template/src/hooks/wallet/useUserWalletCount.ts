import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../useWalletProvider";

import DIAMOND_FACTORY_ABI from "../../abis/diamond/DiamondFactory.abi.json";
import { DIAMOND_FACTORY_ADDRESS } from "../../constants/misc";

export function useUserWalletCount() {
  const { provider, account } = useWalletProvider();

  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const connected = !!provider && !!account;

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
        const factory = new ethers.Contract(
          DIAMOND_FACTORY_ADDRESS,
          DIAMOND_FACTORY_ABI,
          provider
        );

        const nextIndex: ethers.BigNumber =
          await factory.userToNextWalletIndexMap(account);

        if (!cancelled) {
          setCount(nextIndex.toNumber());
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
  }, [connected, provider, account]);

  return { count, loading, connected };
}
