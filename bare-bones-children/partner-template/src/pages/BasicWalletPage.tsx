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
} from "../components/BasicComponents";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { WalletSelectorPage } from "./WalletSelectorPage";
import { Stack } from "../components/Primitives";
import { WalletActionHeader } from "../components/UniversalWalletModal/components/WalletActionHeader";

export function BasicWalletPage() {
  const { diamondAddress } = useParams<{ diamondAddress?: string }>();
  if (!diamondAddress) {
    return <WalletSelectorPage />;
  }

  return <BasicWallet diamondAddress={diamondAddress} />;
}

function BasicWallet({ diamondAddress }: { diamondAddress: string }) {
  const { provider } = useShimWallet();
  const [action, setAction] = useState<UniversalActionType | null>(UniversalActionType.DEPOSIT);
  const [submittedValues, setSubmittedValues] = useState<any | null>(null);
  const navigate = useNavigate();

  if (!provider) {
    return <div>No wallet connected</div>;
  }

  return (
    <PageContainer>
      <Card>
        <CardContent>
          <Stack gap="md">
            <WalletActionHeader
              walletAddress={diamondAddress}
              action={action}
              onActionChange={(a) => {
                setAction(a);
                setSubmittedValues(null);
              }}
              onWalletChange={(address) => {
                setAction(null);
                setSubmittedValues(null);
                navigate(`/basic-wallet-facet/${address}`);
              }}
            />

            {action && (
              <UniversalWalletActionForm
                key={`${diamondAddress}-${action}`}
                action={action}
                onConfirm={(formValues) =>
                  setSubmittedValues(formValues)
                }
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
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
