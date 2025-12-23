import { useEffect, useState } from "react";
import { ethers } from "ethers";

import ERC20_ABI from "../abis/ERC20.json";
import { useShimWallet } from "../hooks/useShimWallet";
import { TokenInfo } from "../components/TokenSelect/types";

export function useTokenBalance(token?: TokenInfo | null) {
  const { provider, account } = useShimWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const tokenAddressDep = token?.address;
  const decimalDep = token?.decimals;

  useEffect(() => {
    if (!provider || !account || !tokenAddressDep || decimalDep == null) {
      setBalance(null);
      return;
    }

    // ✅ capture validated values
    const tokenAddress = tokenAddressDep;
    const tokenDecimals = decimalDep;
    const acct = account;

    let cancelled = false;

    async function load() {
      try {
        if (tokenAddress === ethers.constants.AddressZero) {
          const bal = await provider!.getBalance(acct);
          if (!cancelled) {
            setBalance(
              ethers.utils.formatUnits(bal, 18)
            );
          }
        } else {
          const erc20 = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            provider
          );
          const bal = await erc20.balanceOf(acct);
          if (!cancelled) {
            setBalance(
              ethers.utils.formatUnits(bal, tokenDecimals)
            );
          }
        }
      } catch {
        if (!cancelled) setBalance(null);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [provider, account, tokenAddressDep, decimalDep]);

  return balance;
}
