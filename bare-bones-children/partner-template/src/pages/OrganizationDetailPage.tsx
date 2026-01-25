import { useParams } from "react-router-dom";
import { useCallback, useState } from "react";

import { ORGANIZATION_PAGE_METADATA } from "./OrganizationPage";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Row, Surface } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";

import {
  createOrganizationRawTx,
  DEMO_FALLBACK_BEACONS,
  updateOrganizationFallbackBeaconRawTx,
} from "../utils/organizationFallbackDemoUtils";

import { useWalletProvider } from "../hooks/useWalletProvider";
import { useToastActionLifecycle } from "../components/UniversalWalletModal/hooks/useToastActionLifeCycle";
import { executeTx } from "../utils/transactionUtils";

import { WalletSelector } from "../components/Wallet/WalletSelector";
import { DeployDiamondWidget } from "../components/DeployWalletWidget";
import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";

type WalletAddress = string;

export function OrganizationDetailPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const organization = ORGANIZATION_PAGE_METADATA.find(
    (o) => o.organizationId === organizationId
  );

  if (!organization) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Text.Title align="left">Organization not found</Text.Title>
            <Text.Body color="muted">
              The organization you are looking for does not exist.
            </Text.Body>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const isAdmin = true;
  const [selectedWallet, setSelectedWallet] =
    useState<WalletAddress | null>(null);

  const { provider, account, chainId, connect } = useWalletProvider();
  const { count: walletCount, loading, connected } = useUserWalletCount();

  const lifecycle = useToastActionLifecycle();

  const initializeDemo = useCallback(
    async (orgId: string, fallbackBeacon: string) => {
      if (!provider || !account || chainId == null) return;

      await executeTx(
        provider,
        async () =>
          createOrganizationRawTx(orgId, fallbackBeacon, chainId),
        lifecycle,
        () => `Organization ${orgId} initialized`
      );
    },
    [provider, account, chainId, lifecycle]
  );

  const updateDemoFallback = useCallback(
    async (orgId: string, newBeacon: string) => {
      if (!provider || !account || chainId == null) return;

      await executeTx(
        provider,
        async () =>
          updateOrganizationFallbackBeaconRawTx(orgId, newBeacon, chainId),
        lifecycle,
        () => `Fallback updated for ${orgId}`
      );
    },
    [provider, account, chainId, lifecycle]
  );

  return (
    <PageContainer>
      <Stack gap="lg">
        {/* HEADER */}
        <Card>
          <CardContent>
            <Stack gap="sm">
              <Text.Title align="left">{organization.name}</Text.Title>
              {organization.description && (
                <Text.Body color="muted">
                  {organization.description}
                </Text.Body>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* ADMIN SECTION */}
        {isAdmin && (
          <Card>
            <CardContent>
              <Stack gap="md">
                <Text.Title align="left">Organization Admin</Text.Title>

                <Surface>
                  <Stack gap="sm">
                    <Text.Label>Organization Beacon</Text.Label>
                    <Row gap="sm">
                      <ButtonPrimary
                        onClick={() =>
                          updateDemoFallback(
                            organization.organizationId,
                            DEMO_FALLBACK_BEACONS.LOGGER_FALLBACK_DEMO_V1
                          )
                        }
                      >
                        Use Logging Fallback
                      </ButtonPrimary>

                      <ButtonPrimary
                        onClick={() =>
                          updateDemoFallback(
                            organization.organizationId,
                            DEMO_FALLBACK_BEACONS.STATE_MANIPULATOR_DEMO_V1
                          )
                        }
                      >
                        Use State Fallback
                      </ButtonPrimary>
                    </Row>
                  </Stack>
                </Surface>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* USER SECTION */}
        <Card>
          <CardContent>
            <Stack gap="lg">
              <Text.Title align="left">
                Your Organization Wallets
              </Text.Title>

              {!connected && (
                <Surface>
                  <ButtonPrimary onClick={connect}>
                    Connect Wallet
                  </ButtonPrimary>
                </Surface>
              )}

              {connected && loading && (
                <Surface>
                  <Text.Body>Loading wallets…</Text.Body>
                </Surface>
              )}

              {connected && !loading && !selectedWallet && (
                <>
                  {walletCount === 0 ? (
                    <DeployDiamondWidget
                      onDeployed={(addr) => setSelectedWallet(addr)}
                    />
                  ) : (
                    <Surface>
                      <Stack gap="md">
                        <Text.Label>Select Wallet</Text.Label>
                        <WalletSelector
                          walletCount={walletCount!}
                          onSelect={(addr) =>
                            setSelectedWallet(addr)
                          }
                        />
                      </Stack>
                    </Surface>
                  )}
                </>
              )}

              {selectedWallet && (
                <Stack gap="lg">
                  <Surface>
                    <Stack gap="sm">
                      <Text.Label>Active Wallet</Text.Label>
                      <Text.Body>{selectedWallet}</Text.Body>

                      <Row gap="sm">
                        <ButtonPrimary
                          onClick={() => setSelectedWallet(null)}
                        >
                          Change Wallet
                        </ButtonPrimary>

                        <ButtonPrimary>
                          Unenroll
                        </ButtonPrimary>
                      </Row>
                    </Stack>
                  </Surface>

                  <Surface>
                    <Stack gap="md">
                      <Text.Title align="left">
                        Custom Actions
                      </Text.Title>

                      <Row gap="sm">
                        <ButtonPrimary>
                          Log Event
                        </ButtonPrimary>
                        <ButtonPrimary>
                          Store Value
                        </ButtonPrimary>
                      </Row>
                    </Stack>
                  </Surface>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
