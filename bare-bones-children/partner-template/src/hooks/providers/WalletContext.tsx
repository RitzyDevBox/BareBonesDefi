import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { WalletContext } from "./models";
import { toastStore } from "../../components/Toasts/toast.store";
import { ToastBehavior, ToastPosition, ToastType } from "../../components/Toasts/toast.types";

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
  disconnect: () => Promise<void>;
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
  const [status, setStatus] = useState<WalletStatus>("unavailable");

  useEffect(() => {
    if (!window.ethereum) {
      setStatus("unavailable");
      return;
    }

    const web3Provider = new ethers.providers.Web3Provider(
      window.ethereum,
      "any"
    );
    web3Provider.pollingInterval = 12000;

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
    };

  }, []);

  async function connect() {
    if (!provider || !window.ethereum) return;

    setStatus("connecting");

    try {

      // Explicit account request after permissions
      const accs = (await window.ethereum.request?.({
        method: "eth_requestAccounts",
      })) as string[] ?? [];

      if (accs.length > 0) {
        setAccount(accs[0]);
        setStatus("connected");
      } else {
        setStatus("idle");
      }
    } catch (err) {
      const code = (err as { code?: number | string } | null)?.code;
      const message = String((err as { message?: string } | null)?.message ?? "");

      // Expected when user dismisses/rejects the popup.
      // Keep silent and allow immediate retry on next click.
      if (code === 4001 || code === "ACTION_REJECTED" || /user rejected/i.test(message)) {
        toastStore.show({
          id: `wallet-connect-rejected-${Date.now()}`,
          title: "Original Wallet Connect Request was Rejected Unlock the wallet and try again,",
          type: ToastType.Error,
          behavior: ToastBehavior.AutoClose,
          durationMs: 10_000,
          position: ToastPosition.Top,
        });
        setStatus("idle");
        return;
      }

      setStatus("idle");
    }
  }

  async function disconnect() {
    // EIP-2255 — supported by MetaMask + most modern injected wallets. The dApp
    // can't *force* a wallet to disconnect (that's user-controlled), but
    // revoking eth_accounts permission causes the wallet to drop the dApp's
    // session so the user has to re-approve next time.
    try {
      await window.ethereum?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Wallet doesn't support revoke — fall through and at least drop local state.
    }
    setAccount(null);
    setStatus("idle");
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        account,
        chainId,
        status,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
