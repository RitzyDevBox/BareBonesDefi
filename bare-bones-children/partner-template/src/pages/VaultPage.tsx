import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";

import { WalletSelector } from "../components/Wallet/WalletSelector";
import { WalletSelectorModalWithDisplay } from "../components/Wallet/WalletSelectorModalWithDisplay";

import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";
import { ROUTES } from "../routes";
import { VaultSelector } from "../components/Vaults/VaultSelector";
import { DeployVaultWidget } from "../components/Vaults/DeployVaultWidget";

export function VaultPage() {
  const navigate = useNavigate();
  const { count: walletCount, loading } = useUserWalletCount();

  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  /* ────────────────────────────
      LOADING
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
      STEP 1 — INITIAL WALLET PICK
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
                onSelect={(walletAddress) =>
                  setSelectedWallet(walletAddress)
                }
              />
            </Stack>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  /* ────────────────────────────
      STEP 2 — VAULT SELECTION
     ──────────────────────────── */
  return (
    <PageContainer>
      <Card>
        <CardContent>
          <Stack gap="md">
            <Row style={{ justifyContent: "space-between" }} align="center" >
              <Text.Title align="left">Select Vault</Text.Title>

              <WalletSelectorModalWithDisplay
                address={selectedWallet}
                onSelect={(addr) => setSelectedWallet(addr)}
              />
            </Row>

            {/* Vault grid */}
            <VaultSelector
              walletAddress={selectedWallet}
              onSelect={(vaultAddress) =>
                navigate(ROUTES.VAULTS_DETAIL_PAGE(vaultAddress))
              }
              footer={
                <DeployVaultWidget walletAddress={selectedWallet} />
              }
            />
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
