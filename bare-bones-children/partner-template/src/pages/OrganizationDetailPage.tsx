import { useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";

import { ORGANIZATION_PAGE_METADATA } from "./OrganizationPage";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row, Surface } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";

import {
  DEMO_FALLBACK_BEACONS,
  //createOrganizationRawTx,
  updateOrganizationFallbackBeaconRawTx,
  enrollOrganizationRawTx,
  unenrollOrganizationRawTx,
  setDemoStateRawTx,
  triggerLoggerFallbackRawTx,
  readDemoState,
  getOrganizationBeacon,
  getOrganizationOwner,
  getIsEnrolledInOrganization
} from "../utils/organizationFallbackDemoUtils";

import { useWalletProvider } from "../hooks/useWalletProvider";
import { WalletSelector } from "../components/Wallet/WalletSelector";
import { DeployDiamondWidget } from "../components/DeployWalletWidget";
import { useUserWalletCount } from "../hooks/wallet/useUserWalletCount";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";

export function OrganizationDetailPage() {
  const { organizationId } = useParams<{ organizationId: string }>();

  const organization = ORGANIZATION_PAGE_METADATA.find(
    (o) => o.organizationId === organizationId
  );

  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [demoValue, setDemoValue] = useState<string>("");
  const [readValue, setReadValue] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [organizationOwner, setOrganizationOwner] = useState<string | null>(null);
  const [currentBeacon, setCurrentBeacon] = useState<string | null>(null);
  const { chainId, connect, provider, account } = useWalletProvider();
  const { count: walletCount, loading, connected } = useUserWalletCount();

  const isUsingLogger = currentBeacon?.toLowerCase() === DEMO_FALLBACK_BEACONS.LOGGER_FALLBACK_DEMO_V1.toLowerCase()
  const isUsingStateManipulator =  currentBeacon?.toLowerCase() === DEMO_FALLBACK_BEACONS.STATE_MANIPULATOR_DEMO_V1.toLowerCase()
  const { version } = useTxRefresh()

  async function refreshOrganizationMeta() {
    if (!provider || !chainId || !organization) return;

    try {
      const [owner, beacon] = await Promise.all([
        getOrganizationOwner(provider, organization.organizationId, chainId),
        getOrganizationBeacon(provider, organization.organizationId, chainId),
      ]);

      setOrganizationOwner(owner);
      setCurrentBeacon(beacon);
    } catch {
      setOrganizationOwner(null);
      setCurrentBeacon(null);
    }
  }


  useEffect(() => {
    if (!provider || !selectedWallet || !organization) {
        setIsEnrolled(null);
        return;
    }

    let cancelled = false;

    async function loadEnrollment() {
        try {
        const enrolled = await getIsEnrolledInOrganization(
            provider!,
            selectedWallet!,
            organization!.organizationId,
            chainId!
        );

        if (!cancelled) setIsEnrolled(enrolled);
        } catch {
        if (!cancelled) setIsEnrolled(false);
        }
    }

    loadEnrollment();

    return () => { cancelled = true; };
  }, [provider, chainId, selectedWallet, organization?.organizationId]);


  useEffect(() => {
    refreshOrganizationMeta();
  }, [provider, chainId, organization?.organizationId, version]);


  const isAdmin = !!account && !!organizationOwner && account.toLowerCase() === organizationOwner.toLowerCase();

  // const createOrgCallBack = useCallback((chainId: number, orgId: string, beacon: string) => createOrganizationRawTx(orgId, beacon, chainId), [])
  // const createOrgStatusMessage = useCallback((_chainId: number, orgId: string, _beacon: string) => `Organization ${orgId} initialized`, [])
  // const initializeDemo = useExecuteRawTx(createOrgCallBack, createOrgStatusMessage);

  const updateDemoFallbackCallback = useCallback((chainId: number, orgId: string, beacon: string) => updateOrganizationFallbackBeaconRawTx(orgId, beacon, chainId), [])
  const updateDemoFallbackStatusMessage = useCallback((_chainId: number, orgId: string, _beacon: string) => `Fallback updated for ${orgId}`, [])
  const updateDemoFallback = useExecuteRawTx(updateDemoFallbackCallback, updateDemoFallbackStatusMessage)

  const enrollOrganizationCallback = useCallback((chainId: number, wallet: string, orgId: string) => enrollOrganizationRawTx(wallet, orgId, chainId), [])
  const enrollOrganizationStatusMessage = useCallback((_chainId: number, _wallet: string, orgId: string) => `Wallet enrolled in ${orgId}`, [])
  const enrollOrganization = useExecuteRawTx(enrollOrganizationCallback, enrollOrganizationStatusMessage)

  const unenrollOrganizationCallback = useCallback((chainId: number, wallet: string) => unenrollOrganizationRawTx(wallet, chainId), [])
  const unenrollOrganizationStatusMessage = useCallback((_chainId: number, _wallet: string) => `Wallet unenrolled`, [])
  const unenrollOrganization = useExecuteRawTx(unenrollOrganizationCallback, unenrollOrganizationStatusMessage)

  const logEventCallback = useCallback((chainId: number, wallet: string) => triggerLoggerFallbackRawTx(wallet, chainId), [])
  const logEventStatusMessage = useCallback((_chainId: number, _wallet: string) => `Fallback event emitted`, [])
  const logEvent = useExecuteRawTx(logEventCallback, logEventStatusMessage)

  const storeValueCallback = useCallback((chainId: number, wallet: string, value: number) => setDemoStateRawTx(wallet, value, chainId), [])
  const storeValueStatusMessage = useCallback((_chainId: number, _wallet: string, _value: number) => `State updated`, [])
  const storeValue = useExecuteRawTx(storeValueCallback, storeValueStatusMessage)


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
                      { isUsingStateManipulator &&   
                        <ButtonPrimary disabled={currentBeacon?.toLowerCase() === DEMO_FALLBACK_BEACONS.LOGGER_FALLBACK_DEMO_V1.toLowerCase()}
                          onClick={() => updateDemoFallback(chainId!, organization.organizationId, DEMO_FALLBACK_BEACONS.LOGGER_FALLBACK_DEMO_V1) }
                        >
                          Use Logging Fallback
                        </ButtonPrimary>
                      }
                      { isUsingLogger && 
                        <ButtonPrimary disabled={currentBeacon?.toLowerCase() === DEMO_FALLBACK_BEACONS.STATE_MANIPULATOR_DEMO_V1.toLowerCase()}
                          onClick={() => updateDemoFallback(chainId!, organization.organizationId, DEMO_FALLBACK_BEACONS.STATE_MANIPULATOR_DEMO_V1) }
                        >
                          Use State Fallback
                        </ButtonPrimary>
                      }
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
                        {isEnrolled === false && <ButtonPrimary onClick={() => enrollOrganization(chainId!, selectedWallet, organization.organizationId)}>Enroll</ButtonPrimary>}
                        {isEnrolled === true && <ButtonPrimary onClick={() => unenrollOrganization(chainId!, selectedWallet)}>Unenroll</ButtonPrimary>}
                      </Row>
                    </Stack>
                  </Surface>
                  {isEnrolled && isUsingStateManipulator && (
                    <Surface>
                      <Stack gap="md">
                        <Text.Title align="left">Store State Value</Text.Title>
                          <Row gap="sm" align="center">
                            <Input
                              value={demoValue}
                              onChange={(e) => setDemoValue(e.target.value)}
                              placeholder="Value"
                              style={{ maxWidth: 160 }}
                            />

                            <ButtonPrimary onClick={() => storeValue(chainId!, selectedWallet, Number(demoValue))} disabled={!demoValue}>
                              Store Value
                            </ButtonPrimary>
                          </Row>

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
                  )}
                  {isEnrolled && isUsingLogger &&  (
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
                  )}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
