import { providers } from "ethers";
import { CHAIN_INFO_MAP } from "../constants/misc";
import { handleCommonTxError, NormalizedTxError, normalizeEip1193Error } from "./txErrorUtils";

function toHexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
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
  } catch (err) {
    const normalized = normalizeEip1193Error(err);

    // User explicitly rejected → silent exit
    if (normalized === NormalizedTxError.USER_REJECTED) {
      return;
    }

    // Chain missing → add then retry
    if (normalized === NormalizedTxError.CHAIN_NOT_ADDED) {
      await addEthereumChain(provider, chainId);
      await switchEthereumChain(provider, chainId);
      return;
    }

    throw handleCommonTxError(err);
  }
}
