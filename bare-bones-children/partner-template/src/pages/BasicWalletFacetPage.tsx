/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";
import { useParams } from "react-router-dom";
import LOUPE_ABI from "../abis/diamond/loupe.abi.json";
import DIAMOND_CUT_ABI from "../abis/diamond/diamondCut.abi.json";
import BASIC_WALLET_FACET_ABI from "../abis/diamond/facets/basicWalletFacet.abi.json";
import { getSelectorsFromABI } from "../utils/getSelectorsFromAbi";
import { TokenActionModal } from "../components/TokenActionModal/TokenActionModal";
import { useCurrencyInfo } from "../hooks/useCurrencyInfo";
import { useSendCurrency } from "../hooks/useSendCurrency";
import { useReceiveCurrency } from "../hooks/useReceiveCurrency";
import "./BasicWalletFacetPage.scss";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WALLET_FACET_ADDRESS = "0x79e2fa7763C4D1884f6a6D98b51220eD79fC4484";
const WALLET_SELECTORS = getSelectorsFromABI(BASIC_WALLET_FACET_ABI);

export function BasicWalletFacetPage() {
  const { diamondAddress } = useParams<{ diamondAddress: string }>();

  if (!diamondAddress) return <div>No diamond address provided</div>;

  return <BasicWalletInstaller diamondAddress={diamondAddress} />;
}

export enum AssetType {
    NATIVE,
    ERC20
}

export enum ModeType {
    SEND,
    RECEIVE
}

export function BasicWalletInstaller({ diamondAddress }: { diamondAddress: string }) {
  const { provider } = useShimWallet();
  const [installed, setInstalled] = useState<boolean | null>(true);
  const [log, setLog] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [mode, setMode] = useState<ModeType>(ModeType.SEND);
  const [assetType, setAssetType] = useState<AssetType>(AssetType.ERC20);

  const {
    decimals,
    symbol: tokenSymbol,
    balanceDiamond,
    balanceUser,
    loading: tokenLoading,
    valid: tokenValid,
    error: tokenError,
  } = useCurrencyInfo(provider, tokenAddress, diamondAddress);

  const appendLog = (m: any) =>
    setLog((l) => l + (typeof m === "string" ? m : JSON.stringify(m)) + "\n");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const checkInstalled = useCallback(async () => {
    if (!provider || !diamondAddress) return;

    const diamond = new ethers.Contract(diamondAddress, LOUPE_ABI, provider);
    const facets = await diamond.facets();

    const isInstalled = facets.some(
      (f: any) => f.facetAddress.toLowerCase() === WALLET_FACET_ADDRESS.toLowerCase()
    );

    setInstalled(isInstalled);
  }, [provider, diamondAddress]);

  async function install() {
    try {
      if (!provider) throw new Error("No provider");
      const signer = provider.getSigner();
      const diamondCut = new ethers.Contract(diamondAddress, DIAMOND_CUT_ABI, signer);

      appendLog("Installing BasicWalletFacet...");

      const tx = await diamondCut.diamondCut(
        [
          {
            facetAddress: WALLET_FACET_ADDRESS,
            action: 0,
            functionSelectors: WALLET_SELECTORS,
          },
        ],
        ZERO_ADDRESS,
        "0x"
      );

      appendLog("Tx: " + tx.hash);
      await tx.wait();

      appendLog("Wallet facet installed!");
      setInstalled(true);
    } catch (e: any) {
      appendLog("Error: " + e.message);
    }
  }

  const { sendCurrency } = useSendCurrency({
    provider,
    diamondAddress,
    assetType,
    amount,
    recipient,
    decimals,
    tokenSymbol,
    tokenAddress,
    appendLog,
    setShowModal,
  });


  const { receiveCurrency } = useReceiveCurrency({
    provider,
    diamondAddress,
    assetType,
    amount,
    decimals,
    tokenAddress,
    tokenSymbol,
    appendLog,
    setShowModal,
  });


  if (installed === null) return <div>Checking module...</div>;

  if (!installed)
    return (
      <div className="install-container">
        <button onClick={install} className="primary-btn">
          Install Basic Wallet Module
        </button>
        <pre className="log-box">{log}</pre>
      </div>
    );

    return (
        <div className="wallet-container">
            <h3 className="wallet-title">Basic Wallet Module</h3>

            <div className="mode-toggle">
            <button
                className={mode === ModeType.SEND ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setMode(ModeType.SEND)}
            >
                Send
            </button>
            <button
                className={mode === ModeType.RECEIVE ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setMode(ModeType.RECEIVE)}
            >
                Receive
            </button>
            </div>

            <div className="mode-toggle">
              <button
                className={assetType === AssetType.ERC20 ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setAssetType(AssetType.ERC20)}
              >
                ERC20
              </button>

              <button
                className={assetType === AssetType.NATIVE ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setAssetType(AssetType.NATIVE)}
              >
                Native
              </button>
            </div>

            {assetType === AssetType.ERC20 && (
            <div className="field-block">
            <label className="field-label">ERC20 Token Address</label>

            <input
                className="input"
                type="text"
                placeholder="0x..."
                value={tokenAddress}
                onChange={(e) => {
                const value = e.target.value.trim();
                setTokenAddress(value);
                }}
            />

            {tokenSymbol && (
                <div className="token-detected">
                {tokenSymbol} detected ({decimals} decimals)
                </div>
            )}
            </div>
            )}

            {/* --- OPEN MODAL BUTTON --- */}
            {(assetType === AssetType.NATIVE || tokenSymbol) && (
            <button
                className="primary-btn"
                onClick={() => setShowModal(true)}
            >
                {mode === ModeType.SEND
                ? `Send ${assetType === AssetType.NATIVE ? "ETH" : tokenSymbol}`
                : `Deposit ${assetType === AssetType.NATIVE ? "ETH" : tokenSymbol}`}
            </button>
            )}

            {showModal && (
                <TokenActionModal
                    mode={mode}
                    tokenSymbol={assetType === AssetType.NATIVE ? "ETH" : tokenSymbol}
                    diamondAddress={diamondAddress}
                    balanceUser={balanceUser}
                    balanceDiamond={balanceDiamond}
                    amount={amount}
                    setAmount={setAmount}
                    recipient={recipient}
                    setRecipient={setRecipient}
                    onClose={() => setShowModal(false)}
                    onConfirm={mode === ModeType.SEND ? sendCurrency : receiveCurrency}
                />
            )}

            <pre className="log-box">{log}</pre>
        </div>
    );
}
