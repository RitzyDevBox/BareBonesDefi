import { useMemo } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "./useWalletProvider";
import { CHAIN_INFO_MAP, DEFAULT_CHAIN_ID } from "../constants/misc";

/**
 * Returns an ethers Provider suitable for read-only on-chain calls.
 * - Prefers the connected wallet's Web3Provider when available.
 * - Falls back to a JsonRpcProvider built from CHAIN_INFO_MAP[chainId].rpcUrls
 *   when no wallet is connected, so pages can render data without forcing
 *   the user to connect. Uses DEFAULT_CHAIN_ID when no chainId is connected.
 */
export function useReadProvider(): ethers.providers.Provider | undefined {
  const { provider, chainId } = useWalletProvider();

  return useMemo(() => {
    if (provider) return provider;
    const cid = chainId ?? DEFAULT_CHAIN_ID;
    const info = CHAIN_INFO_MAP[cid];
    const rpcUrl = info?.rpcUrls?.[0];
    if (!rpcUrl) return undefined;
    try {
      return new ethers.providers.JsonRpcProvider(rpcUrl, cid);
    } catch {
      return undefined;
    }
  }, [provider, chainId]);
}
