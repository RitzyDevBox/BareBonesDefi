/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import ERC20_ABI from "../abis/ERC20.json";

export function useTokenInfo(
  provider: ethers.providers.Web3Provider | undefined,
  tokenAddress: string,
  diamondAddress: string
) {
  const [decimals, setDecimals] = useState<number | null>(null);
  const [symbol, setSymbol] = useState<string>("");
  const [balanceDiamond, setBalanceDiamond] = useState<string>("");
  const [balanceUser, setBalanceUser] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function load() {
      if (!provider) return;
      if (!tokenAddress || tokenAddress.length !== 42) return;

      setLoading(true);
      setError("");
      setValid(null);

      try {
        const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

        const [d, sym] = await Promise.all([
          erc20.decimals(),
          erc20.symbol(),
        ]);

        const diamondBalanceRaw = await erc20.balanceOf(diamondAddress);

        let userBalanceRaw = ethers.BigNumber.from(0);
        try {
          const signer = provider.getSigner();
          const userAddress = await signer.getAddress();
          userBalanceRaw = await erc20.balanceOf(userAddress);
        } catch {
          userBalanceRaw = ethers.BigNumber.from(0);
        }

        const format = (x: any) => ethers.utils.formatUnits(x, d);

        setDecimals(d);
        setSymbol(sym);
        setBalanceDiamond(format(diamondBalanceRaw));
        setBalanceUser(format(userBalanceRaw));

        setValid(true);
      } catch (err: any) {
        setError(String(err));
        setValid(false);
        setDecimals(null);
        setSymbol("");
        setBalanceDiamond("");
        setBalanceUser("");
      }

      setLoading(false);
    }

    load();
  }, [provider, tokenAddress, diamondAddress]);

  return {
    decimals,
    symbol,
    balanceDiamond,
    balanceUser,
    loading,
    valid,
    error,
  };
}
