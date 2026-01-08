/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWalletProvider } from "../hooks/useWalletProvider";
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
import { ROUTES } from "../routes";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";

export function BasicWalletPage() {
  const { diamondAddress } = useParams<{ diamondAddress?: string }>();
  if (!diamondAddress) {
    return <WalletSelectorPage />;
  }

  return <BasicWallet diamondAddress={diamondAddress} />;
}

function BasicWallet({ diamondAddress }: { diamondAddress: string }) {
  const { provider } = useWalletProvider();
  const [action, setAction] = useState<UniversalActionType | null>(UniversalActionType.DEPOSIT);
  const [submittedValues, setSubmittedValues] = useState<any | null>(null);
  const navigate = useNavigate();
  const navigateToWallet = (address: string) => {
    navigate(ROUTES.BASIC_WALLET_WITH_ADDRESS(address));
  };

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
                navigateToWallet(address);
              }}
            />

            {action && (
              <UniversalWalletActionForm
                key={`${diamondAddress}-${action}`}
                action={action}
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
