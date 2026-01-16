// WalletConnectProvider.tsx
import { useEffect, useState } from "react";
import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";
import { WalletConnectContext } from "./WalletConnectContext";

type WalletKitInstance = InstanceType<typeof WalletKit>;

let walletKitPromise: Promise<WalletKitInstance> | null = null;

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
  const [walletKit, setWalletKit] = useState<WalletKitInstance | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!walletKitPromise) {
      const core = new Core({
        projectId: import.meta.env.VITE_APP_WALLET_CONNECT_PROJECT_ID,
      });

      walletKitPromise = WalletKit.init({
        core,
        metadata: {
          name: "Bare Bones",
          description: "Minimal EIP-1193 Wallet",
          url: window.location.origin,
          icons: [],
        },
      });
    }

    walletKitPromise.then(wk => {
      if (mounted) setWalletKit(wk);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!walletKit) return null;

  return (
    <WalletConnectContext.Provider value={walletKit}>
      {children}
    </WalletConnectContext.Provider>
  );
}
