/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useShimWallet } from "../hooks/useShimWallet";
import { UniversalWalletActionForm } from "../components/UniversalWalletModal/UniversalWalletActionForm";
import { ActionHandlerRouter } from "../components/UniversalWalletModal/components/ActionHandlerRouter";
import { UniversalActionType } from "../components/UniversalWalletModal/models";
import { useNavigate } from "react-router-dom";

import {
  Card,
  CardContent,
  Text,
  Box,
} from "../components/BasicComponents";
import { Select } from "../components/Select";
import { SelectOption } from "../components/Select/SelectOption";
import { WalletSelectorModal } from "../components/Wallet/WalletSelectorModal";

export function BasicWalletFacetPage() {
  const { diamondAddress } = useParams<{ diamondAddress?: string }>();
  const [open, setOpen] = useState(!diamondAddress);
  const navigate = useNavigate();
  if (!diamondAddress) {
    return (<WalletSelectorModal 
      isOpen={open} 
      onClose={() => setOpen(false)}
      onSelect={(address) => {
            navigate(`/basic-wallet-facet/${address}`);
      }}
    />);
  }

  return <BasicWallet diamondAddress={diamondAddress} />;
}

function BasicWallet({ diamondAddress }: { diamondAddress: string }) {
  const { provider } = useShimWallet();

  const [action, setAction] = useState<UniversalActionType | null>(null);
  const [submittedValues, setSubmittedValues] = useState<any | null>(null);
  

  if (!provider) {
    return <div>No wallet connected</div>;
  }

  return (
    <Card>
      <CardContent>
        <Text.Title>Smart Wallet</Text.Title>
        <Box style={{ marginTop: "var(--spacing-md)" }}>
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
        </Box>

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
      </CardContent>
    </Card>
  );
}
