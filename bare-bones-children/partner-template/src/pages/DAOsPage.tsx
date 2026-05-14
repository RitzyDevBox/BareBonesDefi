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
import { GovHero } from "../components/DAO/GovHero";
import { DAODetailPage } from "./DAODetailPage";
import { CreateDaoModal } from "../components/Header/CreateDaoModal";
import { getBareBonesConfiguration } from "../constants/misc";
import { orgSlugFor } from "../utils/payroll/orgSlug";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";

interface DaoDeploymentSummary {
  name: string;
  governor: string;
}

export function DAOsPage() {
  const { provider, account, chainId, connect } = useWalletProvider();
  const { version } = useTxRefresh();
  const { activeOrgSlug, ownedOrgs } = useActiveOrganization();
  const config = useMemo(() => (chainId ? getBareBonesConfiguration(chainId) : null), [chainId]);
  const payrollManagerAddress = config?.payrollManagerAddress;

  const [deploymentsByOrg, setDeploymentsByOrg] = useState<Record<string, DaoDeploymentSummary>>({});
  const [loading, setLoading] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);

  // Source of truth for "is a canonical DAO deployed for this org" is the
  // payroll contract's `daoOf(slug)` view — set write-once by the launcher.
  // The subgraph used to back this lookup but went out of sync whenever the
  // graph node was down, so the page would wrongly offer "Deploy DAO" for an
  // org that already had one (and the on-chain write would then revert).
  useEffect(() => {
    let cancelled = false;
    if (!provider || !payrollManagerAddress || ownedOrgs.length === 0) {
      setDeploymentsByOrg({});
      return;
    }
    setLoading(true);
    const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
    Promise.all(
      ownedOrgs.map(async (name) => {
        try {
          const slug = orgSlugFor(name);
          const [governor]: [string, string] = await contract.daoOf(slug);
          if (!governor || governor === ethers.constants.AddressZero) return null;
          return { name, governor: ethers.utils.getAddress(governor) };
        } catch {
          return null;
        }
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const byOrg: Record<string, DaoDeploymentSummary> = {};
        for (const result of results) {
          if (!result) continue;
          byOrg[result.name.toLowerCase()] = result;
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
  }, [provider, payrollManagerAddress, ownedOrgs, version]);

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
                  Connect your wallet to see deployed DAOs and create new ones.
                </Text.Body>
                <Row gap="sm" justify="center">
                  <ButtonPrimary fullWidth={false} size="sm" onClick={() => connect()}>
                    Connect wallet
                  </ButtonPrimary>
                </Row>
              </Stack>
            </CardContent>
          </Card>
        )}

        {account && !activeOrgSlug && (
          <Card>
            <CardContent>
              <Stack gap="md" style={{ alignItems: "center", textAlign: "center", padding: "var(--spacing-md)" }}>
                <Text.Title align="center" size="sm">
                  No organization selected
                </Text.Title>
                <Text.Body color="muted">
                  Pick an existing org from the switcher in the header, or deploy a
                  new DAO to spin one up.
                </Text.Body>
                <Row gap="sm" justify="center">
                  <ButtonPrimary fullWidth={false} size="sm" onClick={() => setShowDeployModal(true)}>
                    Deploy a DAO
                  </ButtonPrimary>
                </Row>
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
