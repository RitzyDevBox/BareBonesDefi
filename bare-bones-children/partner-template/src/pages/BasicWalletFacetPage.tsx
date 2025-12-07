/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";
import { useParams } from "react-router-dom";
import LOUPE_ABI from "../abis/diamond/loupe.abi.json";
import DIAMOND_CUT_ABI from "../abis/diamond/diamondCut.abi.json";
import BASIC_WALLET_FACET_ABI from "../abis/diamond/facets/basicWalletFacet.abi.json";
import { getSelectorsFromABI } from "../utils/getSelectorsFromAbi";

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
  const [installed, setInstalled] = useState<boolean | null>(false);
  const [log, setLog] = useState("");

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

  // If already installed → show placeholder page
  return (
    <div style={{ padding: "16px", background: "#111", borderRadius: "8px" }}>
      <h3>Basic Wallet Module Installed</h3>
      <p>(Placeholder UI — interaction panel goes here)</p>

      <pre style={{ color: "#aaa", whiteSpace: "pre-wrap" }}>{log}</pre>
    </div>
  );
}
