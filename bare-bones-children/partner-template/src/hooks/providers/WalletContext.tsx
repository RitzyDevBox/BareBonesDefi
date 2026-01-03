import React, { createContext, useEffect, useState } from "react";
import { ethers } from "ethers";

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

/* ================= CONTEXT ================= */

export const WalletContext =
  createContext<WalletContextValue | null>(null);

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

    // ---- best-effort initial read (NOT authoritative) ----
    web3Provider.send("eth_accounts", []).then((accs: string[]) => {
      if (accs.length > 0) {
        setAccount(accs[0]);
      }
    });

    web3Provider.send("eth_chainId", []).then((id: unknown) => {
      const parsed = normalizeChainId(id);
      if (parsed !== null) setChainId(parsed);
    });

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

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );
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
