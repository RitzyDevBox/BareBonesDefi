import { useMemo, useEffect, useState } from "react";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { WalletConnectApprovalModal } from "../components/WalletConnect/WalletConnectApproveModal";
import { useWalletConnectWallet } from "../hooks/wallet-connect/useWalletConnectWallet";
import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";
import {
  computeDiamondAddressOrDefault,
  getUserDiamondAddresses,
} from "../utils/computeDiamondAddress";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { SUPPORTED_CHAIN_IDS } from "../constants/misc";
import { switchOrAddEvmChain } from "../utils/chainUtils";
import { useOnSendTransaction } from "../hooks/wallet-connect/provider-methods/useOnSendTransaction";
import { useOnSignTypedData } from "../hooks/wallet-connect/provider-methods/useOnSignTypedData";
import { useOnEstimateGas } from "../hooks/wallet-connect/provider-methods/useOnEstimateGas";
import { useOnEthCall } from "../hooks/wallet-connect/provider-methods/useOnEthCall";
import { DappBrowserHeader } from "../components/DappBrowser/DappBrowserHeader";

const APP_HEADER_HEIGHT = 64;
const BROWSER_HEADER_HEIGHT = 56;

export function DappBrowserPage() {
  const { account, provider, chainId } = useWalletProvider();

  const [url, setUrl] = useState("https://app.uniswap.org");
  const [inputUrl, setInputUrl] = useState(url);
  const [activeWalletAddress, setActiveWalletAddress] =
    useState<string | null>(null);

  useEffect(() => {
    if (!account || !chainId) return;
    setActiveWalletAddress(
      computeDiamondAddressOrDefault(account, 0, chainId)
    );
  }, [account, chainId]);

  const walletCount = useUserWalletCount();
  const accounts = useMemo(() => {
    if (!walletCount.count || !account || !chainId) return [];
    return getUserDiamondAddresses(account, walletCount.count, chainId);
  }, [walletCount.count, account, chainId]);

  const wallet = useWalletConnectWallet({
    projectId: import.meta.env.VITE_APP_WALLET_CONNECT_PROJECT_ID,
    chains: [1, ...SUPPORTED_CHAIN_IDS],
    accounts,
    onEthCall: useOnEthCall(),
    onEstimateGas: useOnEstimateGas(),
    onSendTransaction: useOnSendTransaction(),
    onSignMessage: async () => {
      throw new Error("not implemented");
    },
    onSignTypedData: useOnSignTypedData(activeWalletAddress),
    onSwitchChain: async chainId => {
      if (!provider) throw new Error("Provider disconnected");
      await switchOrAddEvmChain(provider, chainId);
    },
  });

  useEffect(() => {
    const onUnload = () => wallet.disconnect();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  useEffect(() => {
    if (!provider && wallet.connected) {
      wallet.disconnect();
    }
  }, [provider, wallet.connected]);

  function navigate() {
    let next = inputUrl.trim();
    if (!/^https?:\/\//i.test(next)) {
      next = `https://${next}`;
    }
    setUrl(next);
  }

  return (
    <PageContainer style={{ padding: 0 }}>
      {/* ---------- Header ---------- */}
      <div
        style={{
          position: "fixed",
          top: APP_HEADER_HEIGHT,
          left: 0,
          right: 0,
          zIndex: 2,
        }}
      >
        <DappBrowserHeader
          inputUrl={inputUrl}
          onChangeUrl={setInputUrl}
          onNavigate={navigate}
          walletConnected={wallet.connected}
          onPair={wallet.pair}
          onDisconnect={wallet.disconnect}
          activeWalletAddress={activeWalletAddress}
        />
      </div>

      {/* ---------- Iframe ---------- */}
      <div
        style={{
          position: "fixed",
          top: APP_HEADER_HEIGHT + BROWSER_HEADER_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <iframe
          src={url}
          title="Dapp Browser"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="clipboard-write"
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>

      <WalletConnectApprovalModal
        proposal={wallet.pendingProposal}
        onApprove={async () => {
          if (!wallet.pendingProposal) return;
          await wallet.approveSession(wallet.pendingProposal);
        }}
        onReject={wallet.clearProposal}
      />
    </PageContainer>
  );
}
