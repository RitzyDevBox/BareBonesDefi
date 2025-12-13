import { useEffect } from "react";
import { ethers } from "ethers";
import ERC20_ABI from "../../abis/ERC20.json";
import { useShimWallet } from "../../hooks/useShimWallet";

interface TokenInfoResolverProps {
  tokenAddress: string;
  onChange: (value: { tokenSymbol: string; decimals: number }) => void;
}

export function TokenInfoResolver({
  tokenAddress,
  onChange,
}: TokenInfoResolverProps) {

  const { provider } = useShimWallet();
  useEffect(() => {
    if (!tokenAddress || !ethers.utils.isAddress(tokenAddress) || !provider) return;

    let cancelled = false;

    async function load() {
      try {
        const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

        const [symbol, decimals] = await Promise.all([
          erc20.symbol(),
          erc20.decimals(),
        ]);

        if (!cancelled) {
          onChange({
            tokenSymbol: symbol,
            decimals,
          });
        }
      } catch (err) {
        console.error("TokenInfoResolver failed:", err);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tokenAddress, provider, onChange]);

  return null;
}
