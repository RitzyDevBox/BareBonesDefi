import { ethers } from "ethers";
import { CHAIN_INFO_MAP } from "../constants/misc";

const FAUCET_TARGET_ETH = "100";
// Auto-faucet only kicks in below this — keeps us from clobbering an existing
// balance every time the user reconnects.
const AUTO_FAUCET_THRESHOLD_ETH = "1";

function rpcFor(chainId: number): ethers.providers.JsonRpcProvider {
  const chain = CHAIN_INFO_MAP[chainId];
  if (!chain) throw new Error(`Unknown chain ${chainId}`);
  if (!chain.testnet) throw new Error(`Faucet only works on testnets (chain ${chainId})`);
  const rpcUrl = chain.rpcUrls?.[0];
  if (!rpcUrl) throw new Error(`No RPC url configured for chain ${chainId}`);
  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

export async function getNativeBalance(account: string, chainId: number): Promise<ethers.BigNumber> {
  return rpcFor(chainId).getBalance(account);
}

/** Sets `account`'s native balance to FAUCET_TARGET_ETH via the Anvil-only
 *  `anvil_setBalance` cheatcode. Throws if the chain isn't a testnet, the RPC
 *  isn't Anvil, or the call is rejected. */
export async function faucetAnvil(account: string, chainId: number): Promise<ethers.BigNumber> {
  const rpc = rpcFor(chainId);
  const target = ethers.utils.parseEther(FAUCET_TARGET_ETH);
  await rpc.send("anvil_setBalance", [account, ethers.utils.hexValue(target)]);
  return target;
}

export async function maybeAutoFaucet(
  account: string,
  chainId: number,
): Promise<{ topped: boolean; balance: ethers.BigNumber }> {
  const balance = await getNativeBalance(account, chainId);
  const threshold = ethers.utils.parseEther(AUTO_FAUCET_THRESHOLD_ETH);
  if (balance.gte(threshold)) return { topped: false, balance };
  const newBalance = await faucetAnvil(account, chainId);
  return { topped: true, balance: newBalance };
}
