import { Outlet } from "react-router-dom";
import { useWalletProvider } from "./hooks/useWalletProvider";
import { switchOrAddEvmChain } from "./utils/chainUtils";
import { ToastHost } from "./components/Toasts/ToastHost";
import { Header } from "./components/PageWrapper/Header";
import { AppBackground } from "./components/PageWrapper/AppBackground";
import { ActiveOrganizationProvider } from "./providers/ActiveOrganizationProvider";
import { useAutoFaucet } from "./hooks/useAutoFaucet";
import { StagingIntroModal } from "./components/Staging/StagingIntroModal";

export default function App() {
  const { account, chainId, connect, disconnect, provider } = useWalletProvider();
  useAutoFaucet();

  return (
    <AppBackground>
      <ActiveOrganizationProvider>
        <ToastHost />
        <StagingIntroModal />
        <Header
          account={account}
          chainId={chainId}
          onConnectWallet={connect}
          onDisconnectWallet={disconnect}
          onChainChange={(chainId) => {
            if (!provider) return;
            switchOrAddEvmChain(provider, chainId);
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
      </ActiveOrganizationProvider>
    </AppBackground>
  );
}
