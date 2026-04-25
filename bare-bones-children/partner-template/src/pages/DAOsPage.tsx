import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent } from "../components/BasicComponents";
import { CopyButton } from "../components/Button/Actions/CopyButton";
import { ButtonPrimary } from "../components/Button/ButtonPrimary";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Row, Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { useActiveOrganization } from "../providers/ActiveOrganizationProvider";
import { shortAddress } from "../utils/formatUtils";
import { fetchDaoGovernorsByNames } from "../utils/graph/daoGraphService";
import { GovHero } from "../components/DAO/GovHero";
import { DAODetailPage } from "./DAODetailPage";
import { CreateDaoModal } from "../components/Header/CreateDaoModal";

interface DaoDeploymentSummary {
  name: string;
  governor: string;
  txHash: string;
}

export function DAOsPage() {
  const { account, chainId } = useWalletProvider();
  const { version } = useTxRefresh();
  const { activeOrgSlug, ownedOrgs } = useActiveOrganization();

  const [deploymentsByOrg, setDeploymentsByOrg] = useState<Record<string, DaoDeploymentSummary>>({});
  const [loading, setLoading] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (chainId == null || ownedOrgs.length === 0) {
      setDeploymentsByOrg({});
      return;
    }
    setLoading(true);
    fetchDaoGovernorsByNames(chainId, ownedOrgs)
      .then((governors) => {
        if (cancelled) return;
        const byOrg: Record<string, DaoDeploymentSummary> = {};
        for (const governor of governors) {
          const name = (governor.name ?? "").trim();
          if (!name) continue;
          try {
            byOrg[name.toLowerCase()] = {
              name,
              governor: ethers.utils.getAddress(governor.id),
              txHash: String(governor.txHash ?? ""),
            };
          } catch {
            // skip malformed entries
          }
        }
        setDeploymentsByOrg(byOrg);
      })
      .catch(() => {
        if (!cancelled) setDeploymentsByOrg({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chainId, ownedOrgs, version]);

  const activeDeployment = useMemo(() => {
    const slug = activeOrgSlug?.trim().toLowerCase();
    return slug ? (deploymentsByOrg[slug] ?? null) : null;
  }, [activeOrgSlug, deploymentsByOrg]);

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <GovHero
          crumb={`${account ? shortAddress(account) : "Not connected"} · ${chainId != null ? `Chain ${chainId}` : "No chain"}`}
          title="DAOs"
        />

        {!account && (
          <Card>
            <CardContent>
              <Stack gap="md" style={{ alignItems: "center", textAlign: "center", padding: "var(--spacing-md)" }}>
                <Text.Body color="muted">
                  Connect your wallet to see deployed DAOs and create new ones from the organization switcher.
                </Text.Body>
              </Stack>
            </CardContent>
          </Card>
        )}

        {account && !activeOrgSlug && (
          <Card>
            <CardContent>
              <Stack gap="sm" style={{ alignItems: "center", textAlign: "center", padding: "var(--spacing-md)" }}>
                <Text.Title align="center" size="sm">
                  No organization selected
                </Text.Title>
                <Text.Body color="muted">
                  Use the organization switcher in the header to pick or create one.
                </Text.Body>
              </Stack>
            </CardContent>
          </Card>
        )}

        {account && activeOrgSlug && activeDeployment && (
          <DAODetailPage
            daoAddressOverride={activeDeployment.governor}
            embedded
            showBackButton={false}
          />
        )}

        {account && activeOrgSlug && !activeDeployment && (
          <Card>
            <CardContent>
              <Stack gap="md" style={{ alignItems: "center", textAlign: "center", padding: "var(--spacing-md)" }}>
                <Text.Title align="center" size="sm">
                  No DAO deployed for "{activeOrgSlug}"
                </Text.Title>
                <Text.Body color="muted">
                  {loading
                    ? "Looking up deployed governors…"
                    : "Your organization is registered but no on-chain DAO has been deployed yet."}
                </Text.Body>
                <Row gap="sm" justify="center">
                  <ButtonPrimary
                    fullWidth={false}
                    size="sm"
                    onClick={() => setShowDeployModal(true)}
                    disabled={loading}
                  >
                    Deploy DAO
                  </ButtonPrimary>
                </Row>
              </Stack>
            </CardContent>
          </Card>
        )}

        <CreateDaoModal
          isOpen={showDeployModal}
          onClose={() => setShowDeployModal(false)}
          lockedOrgSlug={activeOrgSlug ?? undefined}
        />

        {account && ownedOrgs.length > 1 && (
          <Card>
            <CardContent>
              <Stack gap="sm">
                <Text.Title align="left" size="sm">
                  Your organizations
                </Text.Title>
                <Stack gap="xs">
                  {ownedOrgs.map((slug) => {
                    const summary = deploymentsByOrg[slug.toLowerCase()];
                    return (
                      <Row
                        key={slug}
                        justify="between"
                        gap="sm"
                        style={{
                          alignItems: "center",
                          padding: "10px 12px",
                          border: "1px solid var(--colors-border)",
                          borderRadius: "var(--radius-md)",
                          background:
                            slug === activeOrgSlug
                              ? "color-mix(in oklab, var(--colors-primary) 8%, transparent)"
                              : "var(--colors-surface)",
                        }}
                      >
                        <Stack gap="xs">
                          <Text.Body>{slug}</Text.Body>
                          <Text.Body size="sm" color="muted">
                            {summary
                              ? `Governor ${shortAddress(summary.governor)}`
                              : "No DAO deployed"}
                          </Text.Body>
                        </Stack>
                        {summary && (
                          <CopyButton value={summary.governor} ariaLabel="Copy governor address" />
                        )}
                      </Row>
                    );
                  })}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
}
