import { useParams } from "react-router-dom";

import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Surface } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";

export function VaultWalletPage() {
  const { vaultAddress } = useParams<{ vaultAddress: string }>();

  if (!vaultAddress) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Text.Title align="left">Wallet not found</Text.Title>
            <Text.Body color="muted">
              No wallet address was provided.
            </Text.Body>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Stack gap="lg">
        {/* HEADER */}
        <Card>
          <CardContent>
            <Stack gap="sm">
              <Text.Title align="left">Wallet Vaults</Text.Title>
              <Text.Body color="muted">
                Vault configuration and asset policies for this wallet.
              </Text.Body>
              <Text.Body color="muted">
                {vaultAddress}
              </Text.Body>
            </Stack>
          </CardContent>
        </Card>

        {/* EMPTY STATE */}
        <Card>
          <CardContent>
            <Surface>
              <Stack gap="md">
                <Text.Title align="left">No Vaults Configured</Text.Title>
                <Text.Body color="muted">
                  This wallet does not have any vaults configured yet.
                  Vaults allow you to define policy-based rules for releasing
                  and withdrawing assets.
                </Text.Body>
              </Stack>
            </Surface>
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
