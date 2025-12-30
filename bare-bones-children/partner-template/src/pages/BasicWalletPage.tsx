/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useShimWallet } from "../hooks/useShimWallet";
import { UniversalWalletActionForm } from "../components/UniversalWalletModal/UniversalWalletActionForm";
import { ActionHandlerRouter } from "../components/UniversalWalletModal/components/ActionHandlerRouter";
import { UniversalActionType } from "../components/UniversalWalletModal/models";

import {
  Card,
  CardContent,
  Text,
  Box,
} from "../components/BasicComponents";
import { Select } from "../components/Select";
import { SelectOption } from "../components/Select/SelectOption";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { APP_NAME } from "../constants/misc";
import { WalletSelectorPage } from "./WalletSelectorPage";
import { WalletSelectorModalWithDisplay } from "../components/Wallet/WalletSelectorModalWithDisplay";

export function BasicWalletPage() {
  const { diamondAddress } = useParams<{ diamondAddress?: string }>();
  if (!diamondAddress) {
    return <WalletSelectorPage />;
  }

  return <BasicWallet diamondAddress={diamondAddress} />;
}

function BasicWallet({ diamondAddress }: { diamondAddress: string }) {
  const { provider } = useShimWallet();

  const [action, setAction] = useState<UniversalActionType | null>(null);
  const [submittedValues, setSubmittedValues] = useState<any | null>(null);
  const navigate = useNavigate();

  

  if (!provider) {
    return <div>No wallet connected</div>;
  }

  return (
    <PageContainer>
      <Card>
        <CardContent>
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--spacing-md)",
            }}
          >
            <Text.Title>{APP_NAME} Wallet</Text.Title>

            <WalletSelectorModalWithDisplay
              address={diamondAddress}
              onSelect={(address) => {
                setAction(null);
                setSubmittedValues(null);
                navigate(`/basic-wallet-facet/${address}`);
              }}
            />
          </Box>
          <Box style={{ marginTop: "var(--spacing-md)" }}>
            <Select
              value={action}
              onChange={(v) => setAction(v as UniversalActionType)}
              placeholder="Select Action"
            >
              <SelectOption value={UniversalActionType.WITHDRAW} label="Withdraw" />
              <SelectOption value={UniversalActionType.DEPOSIT} label="Deposit" />
              <SelectOption value={UniversalActionType.WRAP} label="Wrap ETH" />
              <SelectOption value={UniversalActionType.UNWRAP} label="Unwrap WETH" />
            </Select>
          </Box>

          {action && (
            <UniversalWalletActionForm
              //!!Important!!: we need this key so the state of the internal fields does not persist when switch the action
              key={`${diamondAddress}-${action}`}
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
    </PageContainer>
  );
}
