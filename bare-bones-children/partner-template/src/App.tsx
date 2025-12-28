import { Outlet } from "react-router-dom";
import { useShimWallet } from "./hooks/useShimWallet";
import { switchEvmChain } from "./utils/chainUtils";
import { ToastHost } from "./components/Toasts/ToastHost";
import { Header } from "./components/PageWrapper/Header";

export default function App() {
  const { account, chainId, connect, provider } = useShimWallet();

  return (
    <>
      <ToastHost />

      <Header
        account={account}
        chainId={chainId}
        onConnectWallet={connect}
        onChainChange={(chainId) => {
          if (!provider) return;
          switchEvmChain(provider, chainId);
        }}
      />

      <main style={{ padding: "var(--spacing-lg)" }}>
        <Outlet />
      </main>
    </>
  );
}
