import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { WalletContext } from "./models";

/* ================= TYPES ================= */

export type WalletStatus =
  | "unavailable"   // no provider at all
  | "idle"          // provider exists, not connected
  | "connecting"    // user approving
  | "connected";    // explicitly approved

export interface WalletContextValue {
  provider?: ethers.providers.Web3Provider;
  account: string | null;
  chainId: number | null;
  status: WalletStatus;
  connect: () => Promise<void>;
}

/* ================= HELPERS ================= */

function normalizeChainId(id: unknown): number | null {
  if (typeof id === "string") {
    return parseInt(id, 16);
  }
  if (typeof id === "number") {
    return id;
  }
  return null;
}


/* ================= PROVIDER ================= */

export function WalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider>();
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] =
    useState<WalletStatus>("unavailable");

  useEffect(() => {
    if (!window.ethereum) {
      setStatus("unavailable");
      return;
    }

    const web3Provider = new ethers.providers.Web3Provider(
      window.ethereum,
      "any"
    );

    setProvider(web3Provider);
    setStatus("idle");

    // ---- authoritative sync helper ----
    const syncWalletState = async () => {
      try {
        const [accs, id] = await Promise.all([
          web3Provider.send("eth_accounts", []) as Promise<string[]>,
          web3Provider.send("eth_chainId", []) as Promise<unknown>,
        ]);

        if (!accs || accs.length === 0) {
          setAccount(null);
          setStatus("idle");
        } else {
          setAccount(accs[0]);
          setStatus("connected");
        }

        const parsed = normalizeChainId(id);
        if (parsed !== null) setChainId(parsed);
      } catch {
        setAccount(null);
        setStatus("idle");
      }
    };

    // initial sync
    void syncWalletState();

    // ---- listeners ----
    const handleAccountsChanged = (accs: string[]) => {
      if (accs.length === 0) {
        setAccount(null);
        setStatus("idle");
      } else {
        setAccount(accs[0]);
        setStatus("connected");
      }
    };

    const handleChainChanged = (id: unknown) => {
      const parsed = normalizeChainId(id);
      if (parsed !== null) setChainId(parsed);
    };

    const handleVisibilityOrFocus = () => {
      void syncWalletState();
    };

    window.ethereum?.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum?.on?.("chainChanged", handleChainChanged);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    const syncInterval = window.setInterval(handleVisibilityOrFocus, 3000);

    return () => {
        window.ethereum?.removeListener?.(
            "accountsChanged",
            handleAccountsChanged
        );
        window.ethereum?.removeListener?.(
            "chainChanged",
            handleChainChanged
        );
        window.removeEventListener("focus", handleVisibilityOrFocus);
        document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
        window.clearInterval(syncInterval);
    };

  }, []);

  async function connect() {
    if (!provider) return;

    setStatus("connecting");

    try {
      const accs: string[] = await provider.send(
        "eth_requestAccounts",
        []
      );

      if (accs.length > 0) {
        setAccount(accs[0]);
        setStatus("connected");
      } else {
        setStatus("idle");
      }
    } catch {
      // user rejected
      setStatus("idle");
    }
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        account,
        chainId,
        status,
        connect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
