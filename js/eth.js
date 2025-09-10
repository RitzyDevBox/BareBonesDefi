import { toHex, parseUnits } from './utils.js';

// connection & basic RPC helpers
export const hasProvider = () => !!getProvider();

export function getProvider() {
    const eth = typeof window !== 'undefined' ? window.ethereum : null;
    if (!eth) return null;
    // If multiple providers are injected, prefer Brave, then MetaMask
    if (eth.providers && eth.providers.length) {
        const brave = eth.providers.find(p => p.isBraveWallet);
        if (brave) return brave;
        const metamask = eth.providers.find(p => p.isMetaMask);
        if (metamask) return metamask;
        return eth.providers[0];
    }
    return eth;
}

export async function connect() {
    const provider = getProvider();
    if (!provider) throw new Error('No injected wallet found.');
    const [address] = await provider.request({ method: 'eth_requestAccounts' });
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    return { address, chainId: Number(chainIdHex) };
}

export function onAccountsChanged(cb) {
  const p = getProvider(); if (p && p.on) p.on('accountsChanged', cb);
}

export function onChainChanged(cb) {
  const p = getProvider(); if (p && p.on) p.on('chainChanged', cb);
}

export async function sendNative(from, to, amountDecimal) {
  const provider = getProvider();
  if (!provider) throw new Error('No provider');
  const value = parseUnits(amountDecimal, 18); // native typically 18
  const tx = {
    from,
    to,
    value: toHex(value),
  };
  // Let the wallet estimate gas/fee
  const hash = await provider.request({ method: 'eth_sendTransaction', params: [tx] });
  return hash;
}

export async function sendTx(tx) {
    const provider = getProvider();
    if (!provider) throw new Error('No provider');
    return await provider.request({ method: 'eth_sendTransaction', params: [tx] });
}
