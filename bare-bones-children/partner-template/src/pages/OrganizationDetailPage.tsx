import { useParams } from "react-router-dom";
import { useState } from "react";

import { ORGANIZATION_PAGE_METADATA } from "./OrganizationPage";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Row, Surface } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";

/**
 * Placeholder types — you’ll replace these with real hooks
 */
type WalletAddress = string;

export function OrganizationDetailPage() {
  const { organizationId } = useParams<{ organizationId: string }>();

  const organization = ORGANIZATION_PAGE_METADATA.find((o) => o.id === organizationId);

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
  const isAdmin = false; // ← replace with hook later
  const [selectedWallet, setSelectedWallet] =
    useState<WalletAddress | null>(null);

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

                    {/* Placeholder input */}
                    <input
                      placeholder="0xBeaconAddress"
                      style={{
                        width: "100%",
                        padding: "var(--spacing-sm)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--colors-border)",
                        background: "var(--colors-background)",
                        color: "var(--colors-text-main)",
                      }}
                    />

                    <Row justify="end">
                      <ButtonPrimary>
                        Update Beacon
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
                          Post Event
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
