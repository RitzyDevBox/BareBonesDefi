import { Outlet } from "react-router-dom";
import { useShimWallet } from "./hooks/useShimWallet";
import { switchEvmChain } from "./utils/chainUtils";
import { ToastHost } from "./components/Toasts/ToastHost";
import { Header } from "./components/PageWrapper/Header";
import { AppBackground } from "./components/PageWrapper/AppBackground";

export default function App() {
  const { account, chainId, connect, provider } = useShimWallet();

  return (
    <>
      <AppBackground>
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

        <main
          style={{
            padding: "var(--page-padding)",
            paddingTop: "var(--spacing-md)",
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </main>
      </AppBackground>
    </>
  );
}
