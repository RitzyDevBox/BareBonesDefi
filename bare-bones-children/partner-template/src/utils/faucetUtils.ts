import { ethers } from "ethers";
import { CHAIN_INFO_MAP, getBareBonesConfiguration, getMockGovernanceTokenByChain } from "../constants/misc";

const FAUCET_TARGET_ETH = "100";
// Auto-faucet only kicks in below this — keeps us from clobbering an existing
// balance every time the user reconnects.
const AUTO_FAUCET_THRESHOLD_ETH = "1";

// Mock token top-up — same idea as the ETH faucet but for the governance + payment
// mock tokens deployed alongside anvil. Both contracts expose an open mint().
const MOCK_TOKEN_TARGET_UNITS = "100000"; // 100k * 1e18
const MOCK_TOKEN_THRESHOLD_UNITS = "1"; // re-mint when < 1 token, same posture as ETH

const ANVIL_UNLOCKED_DEFAULT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ERC20_BALANCE_OF_ABI = ["function balanceOf(address) view returns (uint256)"];
const ERC20_MINT_ABI = ["function mint(address to, uint256 amount)"];

function rpcFor(chainId: number): { provider: ethers.providers.JsonRpcProvider; rpcUrl: string } {
  const chain = CHAIN_INFO_MAP[chainId];
  if (!chain) throw new Error(`Unknown chain ${chainId}`);
  if (!chain.testnet) throw new Error(`Faucet only works on testnets (chain ${chainId})`);
  const rpcUrl = chain.rpcUrls?.[0];
  if (!rpcUrl) throw new Error(`No RPC url configured for chain ${chainId}`);
  return { provider: new ethers.providers.JsonRpcProvider(rpcUrl), rpcUrl };
}

/** Derive a sibling proxy endpoint URL from the configured RPC URL.
 *  `https://staging.bear-bones.xyz/rpc` → `https://staging.bear-bones.xyz/<path>`.
 *  For a raw Anvil RPC (e.g. `http://127.0.0.1:8545` in local dev) this still
 *  produces something, but the POST will fail and we'll fall back to a direct
 *  JSON-RPC call. */
function proxyEndpoint(rpcUrl: string, path: string): string {
  try {
    const u = new URL(rpcUrl);
    u.pathname = path;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return rpcUrl.replace(/\/rpc\/?$/, "") + path;
  }
}

/** Returns true when the RPC URL looks like a *proxy* (has a meaningful
 *  path, e.g. `/rpc`) rather than a bare anvil endpoint. Bare anvil
 *  doesn't expose `/faucet` / `/mint-mock-token`, and POST'ing to those
 *  paths against it generates a CORS preflight failure that pollutes
 *  the dapp console — so we skip Path A entirely on local. */
function rpcUrlLooksProxied(rpcUrl: string): boolean {
  try {
    const u = new URL(rpcUrl);
    return u.pathname !== "" && u.pathname !== "/";
  } catch {
    return false;
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

  // Path A: dedicated proxy endpoint. Only attempt when we're actually
  // pointed at a proxy (URL has a path). Bare anvil doesn't expose
  // /faucet — calling it would just generate a CORS preflight failure
  // in the console.
  if (rpcUrlLooksProxied(rpcUrl)) {
    const faucetUrl = proxyEndpoint(rpcUrl, "/faucet");
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

/**
 * Mint mock governance + payment tokens to `account` if they're below the
 * threshold. Both mock token contracts expose an open `mint(address,uint256)`,
 * and we send the call from anvil's default unlocked account directly through
 * the RPC — no user wallet popup. Only meaningful on testnets.
 *
 * Returns the list of token addresses that were topped up (empty if none).
 */
export async function maybeMintMockTokens(
  account: string,
  chainId: number,
): Promise<{ minted: string[] }> {
  const { provider, rpcUrl } = rpcFor(chainId);
  const config = getBareBonesConfiguration(chainId);

  const tokens: { address: string; label: string }[] = [];
  const govToken = getMockGovernanceTokenByChain(chainId);
  if (govToken && govToken !== ethers.constants.AddressZero) {
    tokens.push({ address: govToken, label: "governance" });
  }
  if (
    config.mockPaymentTokenAddress &&
    config.mockPaymentTokenAddress !== ethers.constants.AddressZero
  ) {
    tokens.push({ address: config.mockPaymentTokenAddress, label: "payment" });
  }

  const balanceIface = new ethers.utils.Interface(ERC20_BALANCE_OF_ABI);
  const mintIface = new ethers.utils.Interface(ERC20_MINT_ABI);
  const threshold = ethers.utils.parseUnits(MOCK_TOKEN_THRESHOLD_UNITS, 18);
  const target = ethers.utils.parseUnits(MOCK_TOKEN_TARGET_UNITS, 18);
  const isProxied = rpcUrlLooksProxied(rpcUrl);
  const mintUrl = isProxied ? proxyEndpoint(rpcUrl, "/mint-mock-token") : null;

  const minted: string[] = [];
  for (const token of tokens) {
    const balanceData = balanceIface.encodeFunctionData("balanceOf", [account]);
    const balanceHex: string = await provider.send("eth_call", [
      { to: token.address, data: balanceData },
      "latest",
    ]);
    const balance = ethers.BigNumber.from(balanceHex || "0x0");
    if (balance.gte(threshold)) continue;

    // Path A: dedicated proxy endpoint. Required against the staging RPC,
    // which denies eth_sendTransaction (it would let any visitor send as
    // anvil's pre-unlocked dev account). The proxy enforces the mint()
    // selector and a fixed amount, then dispatches internally. Skipped
    // when pointed at bare anvil — that endpoint doesn't exist there
    // and the preflight CORS failure would just spam the console.
    let viaProxy = false;
    if (mintUrl) {
      try {
        const res = await fetch(mintUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: token.address, recipient: account }),
        });
        if (res.ok) {
          viaProxy = true;
        }
      } catch {
        // Network failure — fall through to direct anvil call.
      }
    }

    if (!viaProxy) {
      // Path B: direct eth_sendTransaction against bare local Anvil. Works
      // because there's no allowlist proxy in front in local dev. Will be
      // denied by the staging proxy — but Path A succeeds there.
      const mintData = mintIface.encodeFunctionData("mint", [account, target]);
      await provider.send("eth_sendTransaction", [
        { from: ANVIL_UNLOCKED_DEFAULT, to: token.address, data: mintData },
      ]);
    }
    minted.push(token.address);
  }

  return { minted };
}
