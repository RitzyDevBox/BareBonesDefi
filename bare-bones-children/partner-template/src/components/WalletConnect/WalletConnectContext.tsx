// WalletConnectContext.tsx
import { createContext, useContext } from "react";
import type SignClient from "@walletconnect/sign-client";

export const WalletConnectContext = createContext<SignClient | null>(null);

export function useWalletConnectClient() {
  const client = useContext(WalletConnectContext);
  if (!client) {
    throw new Error("WalletConnect client not available");
  }
  return client;
}
