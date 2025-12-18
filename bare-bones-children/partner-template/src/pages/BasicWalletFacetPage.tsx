/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";
import { useParams } from "react-router-dom";

import LOUPE_ABI from "../abis/diamond/loupe.abi.json";
import DIAMOND_CUT_ABI from "../abis/diamond/diamondCut.abi.json";
import BASIC_WALLET_FACET_ABI from "../abis/diamond/facets/basicWalletFacet.abi.json";

import { getSelectorsFromABI } from "../utils/getSelectorsFromAbi";

import { UniversalWalletActionForm } from "../components/UniversalWalletModal/UniversalWalletModal";
import { ActionHandlerRouter } from "../components/UniversalWalletModal/components/ActionHandlerRouter";
import { UniversalActionType } from "../components/UniversalWalletModal/models";

import { ZERO_ADDRESS } from "../constants/misc";

import { Card, ButtonPrimary, Text, Box } from "../components/BasicComponents";

const WALLET_FACET_ADDRESS = "0x79e2fa7763C4D1884f6a6D98b51220eD79fC4484";
const WALLET_SELECTORS = getSelectorsFromABI(BASIC_WALLET_FACET_ABI);

export function BasicWalletFacetPage() {
  const { diamondAddress } = useParams<{ diamondAddress: string }>();

  if (!diamondAddress) return <div>No diamond address provided</div>;

  return <BasicWalletInstaller diamondAddress={diamondAddress} />;
}

export function BasicWalletInstaller({ diamondAddress }: { diamondAddress: string }) {
  const { provider } = useShimWallet();

  const [installed, setInstalled] = useState<boolean | null>(null);
  const [log, setLog] = useState("");

  const [action, setAction] = useState<UniversalActionType | null>(null);
  const [submittedValues, setSubmittedValues] = useState<any | null>(null);

  const appendLog = (m: any) =>
    setLog((l) => l + (typeof m === "string" ? m : JSON.stringify(m)) + "\n");

  // ------------------------------------------------------------
  // CHECK IF WALLET FACET INSTALLED
  // ------------------------------------------------------------
  const checkInstalled = useCallback(async () => {
    if (!provider || !diamondAddress) return;

    const signer = provider.getSigner();
    const diamond = new ethers.Contract(diamondAddress, LOUPE_ABI, signer ?? provider);
    const facets = await diamond.facets();

    const isInstalled = facets.some(
      (f: any) => f.facetAddress.toLowerCase() === WALLET_FACET_ADDRESS.toLowerCase()
    );

    setInstalled(isInstalled);
  }, [provider, diamondAddress]);

  useEffect(() => {
    checkInstalled();
  }, [checkInstalled]);

  // ------------------------------------------------------------
  // INSTALL MODULE
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  if (installed === null) return <div>Checking module...</div>;

  // =========================================
  // NOT INSTALLED UI
  // =========================================
  if (!installed)
    return (
      <Card>
        <ButtonPrimary onClick={install}>Install Basic Wallet Module</ButtonPrimary>

        <Box style={{ padding: "var(--spacing-md)", marginTop: "var(--spacing-md)" }}>
          <pre style={{ margin: 0 }}>{log}</pre>
        </Box>
      </Card>
    );

  // =========================================
  // INSTALLED UI
  // =========================================
  return (
    <Card>
      <Text.Title>Basic Wallet Module</Text.Title>

      {/* ACTION SELECT */}
      <select
        value={action ?? ""}
        onChange={(e) =>
          setAction(e.target.value ? (e.target.value as UniversalActionType) : null)
        }
        style={{
          width: "100%",
          padding: "var(--spacing-md)",
          borderRadius: "var(--radius-md)",
          background: "var(--colors-background)",
          color: "var(--colors-text-main)",
          border: "1px solid var(--colors-border)",
          marginTop: "var(--spacing-md)",
        }}
      >
        <option value="">Select Action</option>
        <option value={UniversalActionType.SEND}>Send</option>
        <option value={UniversalActionType.RECEIVE}>Deposit</option>
        <option value={UniversalActionType.WRAP}>Wrap ETH</option>
        <option value={UniversalActionType.UNWRAP}>Unwrap WETH</option>
      </select>

      {/* ACTION FORM */}
      {action && (
        <UniversalWalletActionForm
          action={action}
          onConfirm={(formValues) => setSubmittedValues(formValues)}
        />
      )}

      {/* ACTION HANDLER */}
      {action && submittedValues && (
        <ActionHandlerRouter
          action={action}
          values={submittedValues}
          walletAddress={diamondAddress}
          onDone={() => {
            setAction(null);
            setSubmittedValues(null);
          }}
        />
      )}

      {/* LOG OUTPUT */}
      <Box style={{ padding: "var(--spacing-md)", marginTop: "var(--spacing-md)" }}>
        <pre style={{ margin: 0 }}>{log}</pre>
      </Box>
    </Card>
  );
}
