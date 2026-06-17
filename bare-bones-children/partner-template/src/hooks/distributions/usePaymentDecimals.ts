// Reads the org payment token's `decimals()` so amounts/rates aren't hardcoded to 18. Defaults to 18
// while loading / if the read fails (the local + staging mock token is 18-dec).
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useReadProvider } from "../useReadProvider";
import { useWalletProvider } from "../useWalletProvider";
import { getBareBonesConfiguration } from "../../constants/misc";

const ZERO = ethers.constants.AddressZero;

export function usePaymentDecimals(): number {
  const readProvider = useReadProvider();
  const { chainId } = useWalletProvider();
  const [decimals, setDecimals] = useState(18);

  useEffect(() => {
    const token = chainId != null ? getBareBonesConfiguration(chainId)?.mockPaymentTokenAddress : null;
    if (!readProvider || !token || token === ZERO) return;
    let cancelled = false;
    const c = new ethers.Contract(token, ["function decimals() view returns (uint8)"], readProvider);
    c.decimals()
      .then((d: number) => {
        if (!cancelled) setDecimals(Number(d));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [readProvider, chainId]);

  return decimals;
}
