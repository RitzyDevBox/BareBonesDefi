import { useEffect, useState } from "react";
import { ethers } from "ethers";

export function useShimWallet() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider>();
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    if (window.ethereum) {
      const _provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(_provider);

      // initial state
      _provider.send("eth_accounts", []).then((accs: string[]) => {
        setAccount(accs[0] || null);
      });

      _provider.send("eth_chainId", []).then((id: string) => {
        setChainId(Number(id));
      });

      // event listeners with typed payloads
      window.ethereum?.on?.("accountsChanged", (accs) => {
        if (Array.isArray(accs)) {
          setAccount((accs as string[])[0] || null);
        }
      });

      window.ethereum?.on?.("chainChanged", (id) => {
        if (typeof id === "string" || typeof id === 'number') {
          setChainId(Number(id));
        }
      });
    }
  }, []);

  async function connect() {
    if (!provider) return;
    const accounts: string[] = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
  }

  return { provider, account, chainId, connect };
}
