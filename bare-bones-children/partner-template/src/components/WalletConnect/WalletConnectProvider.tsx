// WalletConnectProvider.tsx
import { useEffect, useState } from "react";
import SignClient from "@walletconnect/sign-client";
import { WalletConnectContext } from "./WalletConnectContext";

export function WalletConnectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<SignClient | null>(null);

  useEffect(() => {
    let mounted = true;

    SignClient.init({
      projectId: import.meta.env.VITE_APP_WALLET_CONNECT_PROJECT_ID,
      metadata: {
        name: "Bare Bones",
        description: "Minimal EIP-1193 Wallet",
        url: window.location.origin,
        icons: [],
      },
    }).then(c => {
      if (mounted) setClient(c);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!client) return null; // or splash/loading

  return (
    <WalletConnectContext.Provider value={client}>
      {children}
    </WalletConnectContext.Provider>
  );
}
