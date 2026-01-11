import { useMemo, useEffect, useState } from "react";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { WalletConnectApprovalModal } from "../components/WalletConnect/WalletConnectApproveModal";
import { WalletConnectUriInput } from "../components/WalletConnect/WalletConnectUriInput";
import { useWalletConnectSession } from "../hooks/wallet-connect/useWalletConnectSession";
import { useWalletConnectWallet } from "../hooks/wallet-connect/useWalletConnectWallet";
import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";
import { computeDiamondAddressOrDefault, getUserDiamondAddresses } from "../utils/computeDiamondAddress";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { SUPPORTED_CHAIN_IDS } from "../constants/misc";
import { switchOrAddEvmChain } from "../utils/chainUtils";
import { useOnSendTransaction } from "../hooks/wallet-connect/provider-methods/useOnSendTransaction";
import { useOnSignTypedData } from "../hooks/wallet-connect/provider-methods/useOnSignTypedData";

const APP_HEADER_HEIGHT = 64;        // your existing header
const BROWSER_HEADER_HEIGHT = 56;    // new temporary header

export function DappBrowserPage() {
  const { account, provider, chainId } = useWalletProvider();
  const sessionUi = useWalletConnectSession();
  const walletCount = useUserWalletCount();
  const walletAddress = computeDiamondAddressOrDefault(account, 0, chainId)

  const onSendTransactionCallback =  useOnSendTransaction()
  const onSignTypedDataCallback = useOnSignTypedData(walletAddress)

  const [url, setUrl] = useState("https://app.uniswap.org");
  const [inputUrl, setInputUrl] = useState(url);

  const accounts = useMemo<string[]>(() => {
    if (!walletCount.count || !account || !chainId) return [];

    return getUserDiamondAddresses(account, walletCount.count, chainId)
  }, [walletCount.count, account, chainId]);

  const wallet = useWalletConnectWallet({
    projectId: import.meta.env.VITE_APP_WALLET_CONNECT_PROJECT_ID,
    // WARNING: We spoof chain 1:Ethereum chain even though its not supported
    // We need to add chain 1 because websites like uniswap will disconnect if we dont claim to support it
    chains: [1, ...SUPPORTED_CHAIN_IDS] ,
    accounts,

    onSendTransaction: onSendTransactionCallback,

    onSignMessage: async (msg) => {
      console.log(msg)
      throw new Error("not implemented");
    },
    onSignTypedData: onSignTypedDataCallback,
    onSwitchChain: async chainId => {
        if (!provider) throw new Error("Provider disconnected");
        await switchOrAddEvmChain(provider, chainId);
        return
    },

    onSessionProposal: sessionUi.onSessionProposal,
  });

  // Kill WC session if injected provider disconnects
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
      {/* ---------- Browser Header (temporary) ---------- */}
      <div
        style={{
          position: "fixed",
          top: APP_HEADER_HEIGHT,
          left: 0,
          right: 0,
          height: BROWSER_HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          background: "var(--colors-surface)",
          borderBottom: "1px solid var(--colors-border)",
          zIndex: 2,
        }}
      >
        {/* URL Bar */}
        <input
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && navigate()}
          style={{
            flex: 1,
            height: 36,
            padding: "0 10px",
            borderRadius: 6,
            border: "1px solid var(--colors-border)",
          }}
        />

        <button onClick={navigate}>Go</button>

        {/* WalletConnect URI input */}
        {!wallet.connected && (
          <WalletConnectUriInput onConnect={wallet.pair} />
        )}

        {wallet.connected && (
          <button onClick={wallet.disconnect}>
            Disconnect
          </button>
        )}
      </div>

      {/* ---------- Iframe ---------- */}
      <div
        style={{
          position: "fixed",
          top: APP_HEADER_HEIGHT + BROWSER_HEADER_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
        }}
      >
        <iframe
          src={url}
          title="Dapp Browser"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="clipboard-write"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>

      {/* ---------- WalletConnect Approval ---------- */}
      <WalletConnectApprovalModal
        proposal={sessionUi.pendingProposal}
        onApprove={async () => {
          await wallet.approveSession(sessionUi.pendingProposal);
          sessionUi.clearProposal();
        }}
        onReject={sessionUi.clearProposal}
      />
    </PageContainer>
  );
}
