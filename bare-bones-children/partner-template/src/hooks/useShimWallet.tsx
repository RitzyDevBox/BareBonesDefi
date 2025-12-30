import { useEffect, useState } from "react";
import { ethers } from "ethers";

function normalizeChainId(id: unknown): number | null {
  if (typeof id === "string") {
    return parseInt(id, 16);
  }

  if (typeof id === "number") {
    return id;
  }

  return null;
}


//TODO: Investigate properly supporting EIP-1193 
export function useShimWallet() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider>();
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    if (!window.ethereum) return;

    const _provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    setProvider(_provider);

    // initial fetch
    _provider.send("eth_accounts", []).then((accs: string[]) => {
      setAccount(accs[0] || null);
    });

    _provider.send("eth_chainId", []).then((id: unknown) => {
      const parsed = normalizeChainId(id);
      if (parsed !== null) {
        setChainId(parsed);
      }
    });


    // --- define handlers ---
    const handleAccountsChanged = (accs: unknown) => {
      if (Array.isArray(accs)) {
        setAccount((accs as string[])[0] || null);
      }
    };

    const handleChainChanged = (id: unknown) => {
      const parsed = normalizeChainId(id);
      if (parsed !== null) {
        setChainId(parsed);
      }
    };

    // --- attach listeners ---
    window.ethereum?.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum?.on?.("chainChanged", handleChainChanged);

    // --- cleanup listeners (IMPORTANT) ---
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  async function connect() {
    if (!provider) return;
    const accounts: string[] = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
  }

  return { provider, account, chainId, connect };
}
