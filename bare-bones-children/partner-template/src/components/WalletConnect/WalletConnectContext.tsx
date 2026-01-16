import { createContext, useContext } from "react";
import type { WalletKit } from "@reown/walletkit";

type WalletKitInstance = InstanceType<typeof WalletKit>;

export const WalletConnectContext =
  createContext<WalletKitInstance | null>(null);

export function useWalletConnectClient(): WalletKitInstance {
  const client = useContext(WalletConnectContext);
  if (!client) {
    throw new Error("WalletConnect client not available");
  }
  return client;
}
