import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";

import { WalletSelector } from "../components/Wallet/WalletSelector";

import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";
import { ROUTES } from "../routes";
import { VaultSelector } from "../components/Vaults/VaultSelector";
import { DeployVaultWidget } from "../components/Vaults/DeployVaultWidget";

export function VaultPage() {
  const navigate = useNavigate();
  const { count: walletCount, loading } = useUserWalletCount();

  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  /* ────────────────────────────
      LOADING WALLETS
     ──────────────────────────── */
  if (loading) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Text.Body>Loading wallets…</Text.Body>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  /* ────────────────────────────
      STEP 1 — SELECT WALLET
     ──────────────────────────── */
  if (!selectedWallet) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Stack gap="md">
              <Text.Title align="left">Select Wallet</Text.Title>

              <WalletSelector
                walletCount={walletCount!}
                onSelect={(walletAddress) => setSelectedWallet(walletAddress)}
              />
            </Stack>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  /* ────────────────────────────
      STEP 2 — SELECT VAULT
     ──────────────────────────── */
  return (
    <PageContainer>
      <Card>
        <CardContent>
          <Stack gap="md">
            <Text.Title align="left">Select Vault</Text.Title>
            <VaultSelector
                walletAddress={selectedWallet}
                onSelect={(vaultAddress) =>
                    navigate(ROUTES.VAULTS_WITH_WALLET_ADDRESS(vaultAddress))
                }
                footer={
                    <>
                        <DeployVaultWidget walletAddress={selectedWallet} />
                        <ButtonPrimary onClick={() => setSelectedWallet(null)}>
                            Change Wallet
                        </ButtonPrimary>
                    </>
                }
            />
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
