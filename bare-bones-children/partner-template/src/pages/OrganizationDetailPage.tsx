import { useParams } from "react-router-dom";
import { useState } from "react";

import { ORGANIZATION_PAGE_METADATA } from "./OrganizationPage";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row, Surface } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";

import {
  DEMO_FALLBACK_BEACONS,
  createOrganizationRawTx,
  updateOrganizationFallbackBeaconRawTx,
  enrollOrganizationRawTx,
  unenrollOrganizationRawTx,
  setDemoStateRawTx,
  triggerLoggerFallbackRawTx,
  readDemoState,
} from "../utils/organizationFallbackDemoUtils";

import { useWalletProvider } from "../hooks/useWalletProvider";
import { WalletSelector } from "../components/Wallet/WalletSelector";
import { DeployDiamondWidget } from "../components/DeployWalletWidget";
import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";

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
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [demoValue, setDemoValue] = useState<string>("");
  const [readValue, setReadValue] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const { chainId, connect, provider } = useWalletProvider();
  const { count: walletCount, loading, connected } = useUserWalletCount();

  const initializeDemo = useExecuteRawTx(
    (chainId: number, orgId: string, beacon: string) =>
      createOrganizationRawTx(orgId, beacon, chainId),
    (orgId) => `Organization ${orgId} initialized`
  );

  const updateDemoFallback = useExecuteRawTx(
    (chainId: number, orgId: string, beacon: string) =>
      updateOrganizationFallbackBeaconRawTx(orgId, beacon, chainId),
    (orgId) => `Fallback updated for ${orgId}`
  );

  const enrollOrganization = useExecuteRawTx(
    (chainId: number, wallet: string, orgId: string) =>
      enrollOrganizationRawTx(wallet, orgId, chainId),
    (_, __, orgId) => `Wallet enrolled in ${orgId}`
  );

  const unenrollOrganization = useExecuteRawTx(
    (chainId: number, wallet: string) =>
      unenrollOrganizationRawTx(wallet, chainId),
    () => `Wallet unenrolled`
  );

  const logEvent = useExecuteRawTx(
    (chainId: number, wallet: string) =>
      triggerLoggerFallbackRawTx(wallet, chainId),
    () => `Fallback event emitted`
  );

  const storeValue = useExecuteRawTx(
    (chainId: number, wallet: string, value: number) =>
      setDemoStateRawTx(wallet, value, chainId),
    () => `State updated`
  );

  async function readState() {
    if (!provider || !selectedWallet) return;

    try {
      const state = await readDemoState(provider, selectedWallet);
      setReadValue(state.value.toString());
      setReadError(null);
    } catch (err: unknown) {
      console.log((err as any).message);
      setReadValue(null);
      setReadError("State not available for current fallback");
    }
  }

  return (
    <PageContainer>
      <Stack gap="lg">
        {/* HEADER */}
        <Card>
          <CardContent>
            <Stack gap="sm">
              <Text.Title align="left">{organization.name}</Text.Title>
              {organization.description && (
                <Text.Body color="muted">{organization.description}</Text.Body>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* ADMIN */}
        {isAdmin && (
          <Card>
            <CardContent>
              <Stack gap="md">
                <Text.Title align="left">Organization Admin</Text.Title>

                <Surface>
                  <Stack gap="sm">
                    <Text.Label>Organization Beacon</Text.Label>
                    <Row gap="sm">
                      <ButtonPrimary onClick={() => updateDemoFallback(chainId!, organization.organizationId, DEMO_FALLBACK_BEACONS.LOGGER_FALLBACK_DEMO_V1)}>
                        Use Logging Fallback
                      </ButtonPrimary>

                      <ButtonPrimary onClick={() => updateDemoFallback(chainId!, organization.organizationId, DEMO_FALLBACK_BEACONS.STATE_MANIPULATOR_DEMO_V1)}>
                        Use State Fallback
                      </ButtonPrimary>
                    </Row>
                  </Stack>
                </Surface>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* USER */}
        <Card>
          <CardContent>
            <Stack gap="lg">
              <Text.Title align="left">Your Organization Wallets</Text.Title>

              {!connected && (
                <Surface>
                  <ButtonPrimary onClick={connect}>Connect Wallet</ButtonPrimary>
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
                    <DeployDiamondWidget onDeployed={(addr) => setSelectedWallet(addr)} />
                  ) : (
                    <Surface>
                      <Stack gap="md">
                        <Text.Label>Select Wallet</Text.Label>
                        <WalletSelector walletCount={walletCount!} onSelect={(addr) => setSelectedWallet(addr)} />
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
                        <ButtonPrimary onClick={() => setSelectedWallet(null)}>Change Wallet</ButtonPrimary>
                        <ButtonPrimary onClick={() => enrollOrganization(chainId!, selectedWallet, organization.organizationId)}>Enroll</ButtonPrimary>
                        <ButtonPrimary onClick={() => unenrollOrganization(chainId!, selectedWallet)}>Unenroll</ButtonPrimary>
                      </Row>
                    </Stack>
                  </Surface>

                  <Surface>
                    <Stack gap="md">
                        <Text.Title align="left">Store State Value</Text.Title>

                        {/* write */}
                        <Row gap="sm" align="center">
                        <Input
                            value={demoValue}
                            onChange={(e) => setDemoValue(e.target.value)}
                            placeholder="Value"
                            style={{ maxWidth: 160 }}
                        />

                        <ButtonPrimary
                            onClick={() => storeValue(chainId!, selectedWallet, Number(demoValue))}
                            disabled={!demoValue}
                        >
                            Store Value
                        </ButtonPrimary>
                        </Row>

                        {/* read */}
                        <Row gap="sm">
                        <ButtonPrimary onClick={readState}>
                            Read Value
                        </ButtonPrimary>
                        </Row>

                      {readValue && (
                        <Text.Body color="muted">
                            Current Value: {readValue}
                        </Text.Body>
                      )}

                      {readError && (
                        <Text.Body color="muted">
                            {readError}
                        </Text.Body>
                      )}
                    </Stack>
                  </Surface>

                  <Surface>
                    <Stack gap="md">
                      <Text.Title align="left">Logger Fallback</Text.Title>

                      <Row gap="sm">
                        <ButtonPrimary onClick={() => logEvent(chainId!, selectedWallet)}>
                            Log Event
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
