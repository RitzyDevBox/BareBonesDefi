/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";
import { useParams } from "react-router-dom";

import LOUPE_ABI from "../abis/diamond/loupe.abi.json";
import DIAMOND_CUT_ABI from "../abis/diamond/diamondCut.abi.json";
import BASIC_WALLET_FACET_ABI from "../abis/diamond/facets/basicWalletFacet.abi.json";

import { getSelectorsFromABI } from "../utils/getSelectorsFromAbi";

import { UniversalWalletActionForm } from "../components/UniversalWalletModal/UniversalWalletActionForm";
import { ActionHandlerRouter } from "../components/UniversalWalletModal/components/ActionHandlerRouter";
import { UniversalActionType } from "../components/UniversalWalletModal/models";

import { ZERO_ADDRESS } from "../constants/misc";

import { Card, ButtonPrimary, Text, Box, CardContent } from "../components/BasicComponents";
import { Select } from "../components/Select";
import { SelectOption } from "../components/Select/SelectOption";

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
    <CardContent>
      <Text.Title>Basic Wallet Module</Text.Title>

      <Select
        value={action}
        onChange={(v) => setAction(v as UniversalActionType)}
        placeholder="Select Action"
      >
        <SelectOption value={UniversalActionType.SEND} label="Send" />
        <SelectOption value={UniversalActionType.RECEIVE} label="Deposit" />
        <SelectOption value={UniversalActionType.WRAP} label="Wrap ETH" />
        <SelectOption value={UniversalActionType.UNWRAP} label="Unwrap WETH" />
      </Select>

      {action && (
        <UniversalWalletActionForm
          action={action}
          onConfirm={(formValues) => setSubmittedValues(formValues)}
        />
      )}

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

      <Box>
        <pre style={{ margin: 0 }}>{log}</pre>
      </Box>
    </CardContent>
  </Card>
);

}
