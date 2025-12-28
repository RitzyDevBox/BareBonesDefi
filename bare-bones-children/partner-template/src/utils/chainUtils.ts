import { providers } from "ethers";
import { CHAIN_INFO_MAP } from "../constants/misc";

function toHexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

interface Eip1193Error extends Error {
  code?: number;
  data?: unknown;
}

function isEip1193Error(error: unknown): error is Eip1193Error {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  );
}


export async function switchEthereumChain(
  provider: providers.Web3Provider,
  chainId: number
): Promise<void> {
  await provider.send("wallet_switchEthereumChain", [
    { chainId: toHexChainId(chainId) },
  ]);
}

export async function addEthereumChain(
  provider: providers.Web3Provider,
  chainId: number,
): Promise<void> {

  const chainInfo = CHAIN_INFO_MAP[chainId];
  if (!chainInfo) {
    throw new Error(`Unknown chainId: ${chainId}`);
  }

  await provider.send("wallet_addEthereumChain", [
    {
      chainId: toHexChainId(chainId),
      chainName: chainInfo.chainName,
      rpcUrls: chainInfo.rpcUrls,
      nativeCurrency: chainInfo.nativeCurrency,
      blockExplorerUrls: chainInfo.blockExplorerUrls,
    },
  ]);
}

export async function switchEvmChain(
  provider: providers.Web3Provider,
  chainId: number
): Promise<void> {
  try {
    await switchEthereumChain(provider, chainId);
  } catch (error: unknown) {
    if (!isEip1193Error(error)) {
      throw error;
    }

    if (error.code === 4001) {
      // user rejected
      return;
    }

    if (error.code !== 4902) {
      throw error;
    }

    await addEthereumChain(provider, chainId);
    await switchEthereumChain(provider, chainId);
  }
}

