/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";
import { useParams } from "react-router-dom";
import LOUPE_ABI from "../abis/diamond/loupe.abi.json";
import DIAMOND_CUT_ABI from "../abis/diamond/diamondCut.abi.json";
import BASIC_WALLET_FACET_ABI from "../abis/diamond/facets/basicWalletFacet.abi.json";
import { getSelectorsFromABI } from "../utils/getSelectorsFromAbi";
import ERC20_ABI from "../abis/ERC20.json";


const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WALLET_FACET_ADDRESS = "0x79e2fa7763C4D1884f6a6D98b51220eD79fC4484";
const WALLET_SELECTORS = getSelectorsFromABI(BASIC_WALLET_FACET_ABI);

export function BasicWalletFacetPage() {
  const { diamondAddress } = useParams<{ diamondAddress: string }>();

  if (!diamondAddress) return <div>No diamond address provided</div>;

  return (
    <BasicWalletInstaller diamondAddress={diamondAddress} />
  );
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


  const appendLog = (m: any) => setLog((l) => l + (typeof m === "string" ? m : JSON.stringify(m)) + "\n");

  const checkInstalled = useCallback(async () => {
    if (!provider || !diamondAddress) return;

    const diamond = new ethers.Contract(diamondAddress, LOUPE_ABI, provider);

    // Get all installed facets on the diamond
    const facets = await diamond.facets();

    // Check if ANY facetAddress matches the BasicWalletFacet singleton
    const isInstalled = facets.some(
        (f: any) =>
        f.facetAddress.toLowerCase() === WALLET_FACET_ADDRESS.toLowerCase()
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
            action: 0, // add
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

//   useEffect(() => {
//     checkInstalled();
//   }, [checkInstalled]);


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
            const contract = new ethers.Contract(
            diamondAddress,
            BASIC_WALLET_FACET_ABI,
            signer
            );

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



  // --------------- UI ------------------

  if (installed === null) return <div>Checking module...</div>;

  if (!installed)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          onClick={install}
          style={{
            padding: "12px",
            borderRadius: "8px",
            background: "#6ee7b7",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Install Basic Wallet Module
        </button>

        <pre style={{ color: "#aaa", whiteSpace: "pre-wrap" }}>{log}</pre>
      </div>
    );

    // If already installed → show interactive page
    return (
    <div style={{ padding: "16px", background: "#111", borderRadius: "8px", color: "#e5e7eb" }}>
        <h3 style={{ marginBottom: "12px" }}>Basic Wallet Module</h3>

        {/* ERC20 Input Section */}
        <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", color: "#9ca3af" }}>
            ERC20 Token Address
        </label>
        <input
            style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            background: "#0d1117",
            border: "1px solid #2a2f3a",
            color: "#e5e7eb",
            }}
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
            <div style={{ marginTop: "8px", fontSize: "14px", color: "#6ee7b7" }}>
            {tokenSymbol} detected ({decimals} decimals)
            </div>
        )}
        </div>

        {/* Show Send Button */}
        {tokenSymbol && (
        <button
            onClick={() => setShowModal(true)}
            style={{
            padding: "12px",
            borderRadius: "8px",
            background: "#6ee7b7",
            color: "#111",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            }}
        >
            Send {tokenSymbol}
        </button>
        )}

        {/* Modal */}
        {showModal && (
        <div
            style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            }}
            onClick={() => setShowModal(false)}
        >
            <div
            style={{
                width: "380px",
                background: "#0f172a",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid #334155",
                color: "#e5e7eb",
            }}
            onClick={(e) => e.stopPropagation()}
            >
            <h3 style={{ marginTop: 0 }}>Send {tokenSymbol}</h3>

            <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                Balance: {balance} {tokenSymbol}
            </p>

            {/* Amount */}
            <label style={{ display: "block", marginTop: "12px", fontSize: "14px" }}>
                Amount
            </label>
            <input
                style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                background: "#0d1117",
                border: "1px solid #2a2f3a",
                color: "#e5e7eb",
                }}
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />

            {/* Recipient */}
            <label style={{ display: "block", marginTop: "12px", fontSize: "14px" }}>
                Recipient Address
            </label>
            <input
                style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                background: "#0d1117",
                border: "1px solid #2a2f3a",
                color: "#e5e7eb",
                }}
                type="text"
                placeholder="0xRecipient..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
            />

            <button
                onClick={sendToken}
                style={{
                width: "100%",
                marginTop: "18px",
                padding: "12px",
                borderRadius: "8px",
                background: "#6ee7b7",
                color: "#111",
                fontWeight: 600,
                cursor: "pointer",
                }}
            >
                Confirm Send
            </button>
            </div>
        </div>
        )}

        <pre style={{ color: "#aaa", whiteSpace: "pre-wrap", marginTop: "20px" }}>{log}</pre>
    </div>
    );

}
