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
import ERC20_ABI from "../abis/ERC20.json";
import { TokenSendModal } from "../components/TokenSendModal/TokenSendModal";


import "./BasicWalletFacetPage.scss";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WALLET_FACET_ADDRESS = "0x79e2fa7763C4D1884f6a6D98b51220eD79fC4484";
const WALLET_SELECTORS = getSelectorsFromABI(BASIC_WALLET_FACET_ABI);

export function BasicWalletFacetPage() {
  const { diamondAddress } = useParams<{ diamondAddress: string }>();

  if (!diamondAddress) return <div>No diamond address provided</div>;

  return <BasicWalletInstaller diamondAddress={diamondAddress} />;
}

export function BasicWalletInstaller({ diamondAddress }: { diamondAddress: string }) {
  const { provider } = useShimWallet();
  const [installed, setInstalled] = useState<boolean | null>(true);
  const [log, setLog] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [decimals, setDecimals] = useState<number | null>(null);
  const [balance, setBalance] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

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

  async function fetchTokenDetails(addr: string) {
    try {
      const erc20 = new ethers.Contract(addr, ERC20_ABI, provider);

      const d = await erc20.decimals();
      const sym = await erc20.symbol();
      const bal = await erc20.balanceOf(diamondAddress);

      setDecimals(d);
      setTokenSymbol(sym);
      setBalance(ethers.utils.formatUnits(bal, d));
    } catch (err) {
      appendLog("ERC20 lookup failed: " + String(err));
      setDecimals(null);
      setTokenSymbol("");
      setBalance("");
    }
  }

  async function sendToken() {
    try {
      if (!provider) throw new Error("No provider");

      const signer = provider.getSigner();
      const contract = new ethers.Contract(diamondAddress, BASIC_WALLET_FACET_ABI, signer);

      const amt = ethers.utils.parseUnits(amount, decimals ?? 18);

      appendLog(`Sending ${amount} ${tokenSymbol} to ${recipient}`);

      const tx = await contract.sendERC20(tokenAddress, recipient, amt);
      appendLog("Tx: " + tx.hash);

      await tx.wait();
      appendLog("Transfer complete!");

      setShowModal(false);
    } catch (err) {
      appendLog("Error sending token: " + String(err));
    }
  }

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
            if (value.length === 42) fetchTokenDetails(value);
          }}
        />

        {tokenSymbol && (
          <div className="token-detected">
            {tokenSymbol} detected ({decimals} decimals)
          </div>
        )}
      </div>

      {tokenSymbol && (
        <button className="primary-btn" onClick={() => setShowModal(true)}>
          Send {tokenSymbol}
        </button>
      )}

    {showModal && (
        <TokenSendModal
            tokenSymbol={tokenSymbol}
            balance={balance}
            amount={amount}
            recipient={recipient}
            setAmount={setAmount}
            setRecipient={setRecipient}
            onClose={() => setShowModal(false)}
            onConfirm={sendToken}
        />
    )}

      <pre className="log-box">{log}</pre>
    </div>
  );
}
