import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Surface } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";

import { WalletSelector } from "../components/Wallet/WalletSelector";
// import { DeployVaultWidget } from "../components/DeployVaultWidget";

import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";
import { ROUTES } from "../routes";

export function VaultPage() {
  const navigate = useNavigate();
  const { count: walletCount, loading } = useUserWalletCount();

  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [vaults, setVaults] = useState<string[] | null>(null);
  const [checkingVaults, setCheckingVaults] = useState(false);

  // Placeholder: fetch vaults for wallet
  useEffect(() => {
    if (!selectedWallet) return;

    let cancelled = false;
    setCheckingVaults(true);

    async function loadVaults() {
      try {
        // TODO: replace with real vault lookup
        // const vaults = await getVaultsForWallet(selectedWallet);
        const vaults: string[] = []; // mock empty

        if (!cancelled) setVaults(vaults);
      } catch {
        if (!cancelled) setVaults([]);
      } finally {
        if (!cancelled) setCheckingVaults(false);
      }
    }

    loadVaults();
    return () => { cancelled = true };
  }, [selectedWallet]);

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

  // STEP 1: Select wallet
  if (!selectedWallet) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Stack gap="md">
              <Text.Title align="left">Select Wallet</Text.Title>
              <WalletSelector
                walletCount={walletCount!}
                onSelect={(addr) => setSelectedWallet(addr)}
              />
            </Stack>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // STEP 2: Checking vaults
  if (checkingVaults) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Text.Body>Checking vaults…</Text.Body>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // STEP 3A: No vaults → deploy
  if (vaults && vaults.length === 0) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Stack gap="md">
              <Text.Title align="left">No Vaults Found</Text.Title>
              <Text.Body color="muted">
                This wallet does not have any vaults deployed yet.
              </Text.Body>

              {/* <DeployVaultWidget
                walletAddress={selectedWallet}
                onDeployed={(vaultAddr) =>
                  navigate(ROUTES.VAULTS_WITH_WALLET_ADDRESS(vaultAddr))
                }
              /> */}

              <ButtonPrimary onClick={() => setSelectedWallet(null)}>
                Change Wallet
              </ButtonPrimary>
            </Stack>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // STEP 3B: Vault list
  return (
    <PageContainer>
      <Card>
        <CardContent>
          <Stack gap="md">
            <Text.Title align="left">Select Vault</Text.Title>

            {vaults!.map((vault) => (
              <Surface
                key={vault}
                onClick={() =>
                  navigate(ROUTES.VAULTS_WITH_WALLET_ADDRESS(vault))
                }
                style={{ cursor: "pointer" }}
              >
                <Text.Body>{vault}</Text.Body>
              </Surface>
            ))}

            <ButtonPrimary onClick={() => setSelectedWallet(null)}>
              Change Wallet
            </ButtonPrimary>
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
