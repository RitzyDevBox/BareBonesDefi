import { useContext } from "react";
import { WalletContext } from "./providers/models";

export function useWalletProvider() {
  const ctx = useContext(WalletContext);

  if (!ctx) {
    throw new Error(
      "useWallet must be used inside WalletProvider"
    );
  }

  return ctx;
}
