import { ethers } from "ethers";
import { CHAIN_INFO_MAP } from "../constants/misc";

const FAUCET_TARGET_ETH = "100";
// Auto-faucet only kicks in below this — keeps us from clobbering an existing
// balance every time the user reconnects.
const AUTO_FAUCET_THRESHOLD_ETH = "1";

function rpcFor(chainId: number): { provider: ethers.providers.JsonRpcProvider; rpcUrl: string } {
  const chain = CHAIN_INFO_MAP[chainId];
  if (!chain) throw new Error(`Unknown chain ${chainId}`);
  if (!chain.testnet) throw new Error(`Faucet only works on testnets (chain ${chainId})`);
  const rpcUrl = chain.rpcUrls?.[0];
  if (!rpcUrl) throw new Error(`No RPC url configured for chain ${chainId}`);
  return { provider: new ethers.providers.JsonRpcProvider(rpcUrl), rpcUrl };
}

/** Derive the staging proxy's `/faucet` URL from the configured RPC URL.
 *  `https://staging.bear-bones.xyz/rpc` → `https://staging.bear-bones.xyz/faucet`.
 *  For a raw Anvil RPC (e.g. `http://127.0.0.1:8545` in local dev) this still
 *  produces something, but the POST will fail and we'll fall back to a direct
 *  `anvil_setBalance` JSON-RPC call. */
function faucetUrlFromRpc(rpcUrl: string): string {
  try {
    const u = new URL(rpcUrl);
    u.pathname = "/faucet";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return rpcUrl.replace(/\/rpc\/?$/, "") + "/faucet";
  }
}

export async function getNativeBalance(account: string, chainId: number): Promise<ethers.BigNumber> {
  return rpcFor(chainId).provider.getBalance(account);
}

/** Tops up `account` to FAUCET_TARGET_ETH. First tries the proxy's `/faucet`
 *  endpoint (production-ish posture, server-controlled amount). If that fails
 *  — e.g. you're pointing at a raw local Anvil with no proxy — falls back to a
 *  direct `anvil_setBalance` JSON-RPC call. Throws if both paths fail. */
export async function faucetAnvil(account: string, chainId: number): Promise<ethers.BigNumber> {
  const { provider, rpcUrl } = rpcFor(chainId);
  const target = ethers.utils.parseEther(FAUCET_TARGET_ETH);

  // Path A: dedicated proxy endpoint.
  const faucetUrl = faucetUrlFromRpc(rpcUrl);
  try {
    const res = await fetch(faucetUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: account }),
    });
    if (res.ok) return target;
  } catch {
    // Network failure — fall through to JSON-RPC fallback.
  }

  // Path B: direct anvil_setBalance (works against bare Anvil; will be denied
  // by the proxy's allowlist, which is fine since Path A would've succeeded
  // there).
  await provider.send("anvil_setBalance", [account, ethers.utils.hexValue(target)]);
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
