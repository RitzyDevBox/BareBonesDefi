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
import { WalletSelectorModalWithDisplay } from "../components/Wallet/WalletSelectorModalWithDisplay";
import { IconButton } from "../components/Button/IconButton";
import { useOnEstimateGas } from "../hooks/wallet-connect/provider-methods/useOnEstimateGas";

const APP_HEADER_HEIGHT = 64;        // your existing header
const BROWSER_HEADER_HEIGHT = 56;    // new temporary header

export function DappBrowserPage() {
  const { account, provider, chainId } = useWalletProvider();
  const sessionUi = useWalletConnectSession();
  const [url, setUrl] = useState("https://app.uniswap.org");
  const [inputUrl, setInputUrl] = useState(url);
  const [activeWalletAddress, setActiveWalletAddress] = useState<string | null>(null)
  useEffect(() => {
    if (!account || !chainId) return;

    setActiveWalletAddress(
      computeDiamondAddressOrDefault(account, 0, chainId)
    );
  }, [account, chainId]);
  
  const walletCount = useUserWalletCount();
  const accounts = useMemo<string[]>(() => {
    if (!walletCount.count || !account || !chainId) return [];

    return getUserDiamondAddresses(account, walletCount.count, chainId)
  }, [walletCount.count, account, chainId]);

  const onSendTransactionCallback =  useOnSendTransaction()
  const onEstimateGasCallback =  useOnEstimateGas()
  const onSignTypedDataCallback = useOnSignTypedData(activeWalletAddress)
  const wallet = useWalletConnectWallet({
    projectId: import.meta.env.VITE_APP_WALLET_CONNECT_PROJECT_ID,
    // WARNING: We spoof chain 1:Ethereum chain even though its not supported
    // We need to add chain 1 because websites like uniswap will disconnect if we dont claim to support it
    chains: [1, ...SUPPORTED_CHAIN_IDS] ,
    accounts,
    onEstimateGas: onEstimateGasCallback,
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

  // useEffect(() => {
  //   if (!wallet.connected || !activeWalletAddress || !chainId) return;
  //   wallet.setActiveAccount(activeWalletAddress);
    
  // }, [activeWalletAddress, chainId, wallet.connected]);


  useEffect(() => {
    const onUnload = () => {
      wallet.disconnect();
    };

    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);


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
            minWidth: 0,
            height: 36,
            padding: "0 10px",
            borderRadius: 6,
            border: "1px solid var(--colors-border)",
          }}
        />

        <button onClick={navigate}>Go</button>
        {wallet.connected && account && chainId && activeWalletAddress != null && (
          <WalletSelectorModalWithDisplay
            address={activeWalletAddress}
            onSelect={(addr) => { 
              setActiveWalletAddress(addr)
            }}
            isDisabled={true}
          />
        )}

        {/* WalletConnect URI input */}
        {!wallet.connected && (
          <WalletConnectUriInput onConnect={wallet.pair} />
        )}

        {wallet.connected && (

          <IconButton
            onClick={wallet.disconnect}
            aria-label="Disconnect"
            size={"lg"}
            shape="square"
            style={{
              top: "var(--spacing-md)",
              right: "var(--spacing-md)",
              zIndex: 2,
            }}
          >
            ⎋
          </IconButton>
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
