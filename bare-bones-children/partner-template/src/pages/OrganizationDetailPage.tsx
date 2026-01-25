import { useParams } from "react-router-dom";
import { useCallback, useState } from "react";

import { ORGANIZATION_PAGE_METADATA } from "./OrganizationPage";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Row, Surface } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";
import { createOrganizationRawTx, DEMO_FALLBACK_BEACONS, updateOrganizationFallbackBeaconRawTx } from "../utils/organizationFallbackDemoUtils";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useToastActionLifecycle } from "../components/UniversalWalletModal/hooks/useToastActionLifeCycle";
import { executeTx } from "../utils/transactionUtils";

/**
 * Placeholder types — you’ll replace these with real hooks
 */
type WalletAddress = string;

export function OrganizationDetailPage() {
  const { organizationId } = useParams<{ organizationId: string }>();

  const organization = ORGANIZATION_PAGE_METADATA.find((o) => o.organizationId === organizationId);

  // --------------------------------------------
  // 1. NOT FOUND
  // --------------------------------------------
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

  // --------------------------------------------
  // Placeholder state
  // --------------------------------------------
  const isAdmin = true; // ← replace with hook later
  const [selectedWallet, setSelectedWallet] = useState<WalletAddress | null>(null);

  const { provider, account, chainId } = useWalletProvider();
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializedOrgId, setInitializedOrgId] = useState<string | null>(null);
  const lifecycle = useToastActionLifecycle();

  const initializeDemo = useCallback(
  async (organizationId: string, fallbackBeacon: string) => {
    if (!provider || !account || chainId == null) return;

        setIsInitializing(true);

        try {
          await executeTx(
            provider,
            async () =>
            createOrganizationRawTx(
                organizationId,
                fallbackBeacon,
                chainId
            ),
            lifecycle,
            () => {
              setInitializedOrgId(organizationId);
              return `Organization ${organizationId} initialized`;
            }
        );
        } finally {
          setIsInitializing(false);
        }
    },
    [provider, account, chainId, lifecycle]
    );

    const [isUpdating, setIsUpdating] = useState(false);
    const [updatedOrgId, setUpdatedOrgId] = useState<string | null>(null);
    const updateDemoFallback = useCallback(
        async (organizationId: string, newFallbackBeacon: string) => {
            if (!provider || !account || chainId == null) return;

            setIsUpdating(true);

            try {
            await executeTx(
                provider,
                async () =>
                updateOrganizationFallbackBeaconRawTx(
                    organizationId,
                    newFallbackBeacon,
                    chainId
                ),
                lifecycle,
                () => {
                setUpdatedOrgId(organizationId);
                return `Fallback updated for ${organizationId}`;
                }
            );
            } finally {
            setIsUpdating(false);
            }
        },
        [provider, account, chainId, lifecycle]
    );


  return (
    <PageContainer>
      <Stack gap="lg">
        {/* ======================================
            HEADER
        ====================================== */}
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

        {/* ======================================
            ADMIN SECTION
        ====================================== */}
        {isAdmin && (
          <Card>
            <CardContent>
              <Stack gap="md">
                <Text.Title align="left">
                  Organization Admin
                </Text.Title>

                {/* Beacon update */}
                <Surface>
                  <Stack gap="sm">
                    <Text.Label>Organization Beacon</Text.Label>
                    <Row justify="end">
                      <ButtonPrimary onClick={() => updateDemoFallback(ORGANIZATION_PAGE_METADATA[0].organizationId, DEMO_FALLBACK_BEACONS["LOGGER_FALLBACK_DEMO_V1"])}>
                        Update Beacon Fallback Logging
                      </ButtonPrimary>
                      <ButtonPrimary onClick={() => updateDemoFallback(ORGANIZATION_PAGE_METADATA[0].organizationId, DEMO_FALLBACK_BEACONS["STATE_MANIPULATOR_DEMO_V1"])}>
                        Update Beacon State Manipulator
                      </ButtonPrimary>
                    </Row>
                  </Stack>
                </Surface>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ======================================
            USER SECTION
        ====================================== */}
        <Card>
          <CardContent>
            <Stack gap="lg">
              <Text.Title align="left">
                Your Organization Wallets
              </Text.Title>

              {/* ----------------------------------
                  Wallet selector / deploy
              ---------------------------------- */}
              {!selectedWallet ? (
                <Stack gap="md">
                  {/* Placeholder: Wallet selector */}
                  <Surface>
                    <Stack gap="sm">
                      <Text.Body>
                        Select or deploy a wallet under this organization.
                      </Text.Body>

                      <Row gap="sm">
                        <ButtonPrimary
                          onClick={() =>
                            setSelectedWallet(
                              "0xDemoWalletAddress"
                            )
                          }
                        >
                          Select Wallet
                        </ButtonPrimary>

                        <ButtonPrimary>
                          Deploy New Wallet
                        </ButtonPrimary>
                      </Row>
                    </Stack>
                  </Surface>
                </Stack>
              ) : (
                <Stack gap="lg">
                  {/* ----------------------------------
                      Selected wallet actions
                  ---------------------------------- */}
                  <Surface>
                    <Stack gap="sm">
                      <Text.Label>
                        Active Wallet
                      </Text.Label>
                      <Text.Body>
                        {selectedWallet}
                      </Text.Body>

                      <Row gap="sm">
                        <ButtonPrimary
                          onClick={() =>
                            setSelectedWallet(null)
                          }
                        >
                          Change Wallet
                        </ButtonPrimary>

                        <ButtonPrimary>
                          Unenroll
                        </ButtonPrimary>
                      </Row>
                    </Stack>
                  </Surface>

                  {/* ----------------------------------
                      Custom actions
                  ---------------------------------- */}
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
