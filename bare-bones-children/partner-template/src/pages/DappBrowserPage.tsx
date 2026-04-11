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
import { DEFAULT_BROWSING_URL, SUPPORTED_CHAIN_IDS } from "../constants/misc";
import { switchOrAddEvmChain } from "../utils/chainUtils";
import { useOnSendTransaction } from "../hooks/wallet-connect/provider-methods/useOnSendTransaction";
import { useOnSignTypedData } from "../hooks/wallet-connect/provider-methods/useOnSignTypedData";
import { useOnEstimateGas } from "../hooks/wallet-connect/provider-methods/useOnEstimateGas";
import { useOnEthCall } from "../hooks/wallet-connect/provider-methods/useOnEthCall";
import { DappBrowserHeader } from "../components/DappBrowser/DappBrowserHeader";
import { useOnBlockNumber } from "../hooks/wallet-connect/provider-methods/useOnBlockNumber";
import { Text } from "../components/Primitives/Text";
import { ButtonSecondary } from "../components/Button/ButtonPrimary";

const APP_HEADER_HEIGHT = 64;
const BROWSER_HEADER_HEIGHT = 56;

function getOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function DappBrowserPage() {
  const { account, provider, chainId } = useWalletProvider();
  const [url, setUrl] = useState(DEFAULT_BROWSING_URL);
  const [lastOrigin, setLastOrigin] = useState<string | null>(getOrigin(url));
  const [inputUrl, setInputUrl] = useState(url);
  const [showIframeWarning, setShowIframeWarning] = useState(true);
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
    onBlockNumber: useOnBlockNumber(),
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
    wallet.disconnect();
  }, []);

  useEffect(() => {
    if (!provider && wallet.connected) {
      wallet.disconnect();
    }
  }, [provider, wallet.connected]);

  async function handleWalletChange(address: string) {
    setActiveWalletAddress(address);
    wallet.setActiveAccount(address);
  }

  function navigate() {
    let next = inputUrl.trim();
    if (!/^https?:\/\//i.test(next)) {
      next = `https://${next}`;
    }

    const nextOrigin = getOrigin(next);

    if (lastOrigin && nextOrigin && lastOrigin !== nextOrigin) {
      wallet.disconnect();
    }

    setLastOrigin(nextOrigin);
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
          onWalletChange={handleWalletChange}
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
          display: "flex",
          flexDirection: "column",
        }}
      >
        {showIframeWarning && (
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--colors-border)",
              background: "var(--colors-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text.Body size="sm" color="warn">
              If refused you will need to open the site in a new tab.
            </Text.Body>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <ButtonSecondary
                size="sm"
                fullWidth={false}
                style={{ flex: 0, whiteSpace: "nowrap" }}
                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              >
                Open in New Tab
              </ButtonSecondary>
              <button
                type="button"
                aria-label="Dismiss warning"
                onClick={() => setShowIframeWarning(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--colors-text-muted)",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0 }}>
          <iframe
            src={url}
            title="Dapp Browser"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            allow="clipboard-write"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      </div>

      <WalletConnectApprovalModal
        proposal={wallet.pendingProposal}
        onApprove={async () => {
          if (!wallet.pendingProposal) return;
          await wallet.approveSession(wallet.pendingProposal);
        }}
        onReject={async () => {
          if (!wallet.pendingProposal) return;
          await wallet.rejectSession(wallet.pendingProposal);
        }}
      />
    </PageContainer>
  );
}
