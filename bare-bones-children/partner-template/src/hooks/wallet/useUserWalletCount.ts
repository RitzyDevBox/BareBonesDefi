import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../useWalletProvider";

import DIAMOND_FACTORY_ABI from "../..//abis/diamond/DiamondFactory.abi.json";
import { DIAMOND_FACTORY_ADDRESS } from "../../constants/misc";

export function useUserWalletCount() {
  const { provider, account } = useWalletProvider();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!provider || !account) {
      setCount(null);
      return;
    }

    let cancelled = false;

    async function load() {
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
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [provider, account]);

  return count;
}
