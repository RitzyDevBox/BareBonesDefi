import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel } from "../models/payments";
import {
  fetchOrganizationEarningsCodes,
  type OrganizationEarningsCodeView,
} from "../utils/payroll/fetchPayrollViews";
import { PayrollEarningsManager } from "../components/PayrollEarningsManager";
import { PayrollNavigation } from "../components/PayrollNavigation";

export function PayrollEarningsPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [loading, setLoading] = useState(false);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [earningsCodes, setEarningsCodes] = useState<OrganizationEarningsCodeView[]>([]);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;

  async function refresh(orgSlug: string) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const org = await contract.organizations(slugBytes);

      setOrgInfo({ owner: org.owner, exists: org.exists });
      setIsAdmin(Boolean(org.exists && org.owner.toLowerCase() === account?.toLowerCase()));

      if (!org.exists) {
        setEarningsCodes([]);
        return;
      }

      const rows = await fetchOrganizationEarningsCodes(
        provider,
        payrollManagerAddress,
        orgSlug,
        undefined,
        account ?? undefined
      );
      setEarningsCodes(rows);
    } catch (error) {
      console.error("Failed to load earnings page", error);
      setOrgInfo(null);
      setEarningsCodes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    refresh(slug);
  }, [slug, provider, payrollManagerAddress, account, version]);

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 980, alignSelf: "center" }}>
          <CardContent>
            <Stack gap="sm">
              <PayrollNavigation slug={slug} active="earnings" title="Earnings Management" />

              {!slug && <Text.Body color="warn">Missing organization slug in route.</Text.Body>}

              {slug && (
                <Text.Body color="muted">
                  Organization: <strong>{slug}</strong>
                </Text.Body>
              )}

              {loading && <Text.Body color="muted">Loading earnings...</Text.Body>}

              {orgInfo && (
                <Stack
                  style={{
                    padding: "var(--spacing-md)",
                    backgroundColor: "var(--colors-background)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <Text.Body>
                    <strong>Owner:</strong> {orgInfo.owner}
                  </Text.Body>
                  <Text.Body color={isAdmin ? "success" : "muted"}>
                    {isAdmin ? "✓ Admin Mode" : "Read Only Mode"}
                  </Text.Body>
                  <Text.Body size="sm" color="muted">
                    Earnings codes: {earningsCodes.length}
                  </Text.Body>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {orgInfo?.exists && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <PayrollEarningsManager slug={slug} canEdit={isAdmin} earningsCodes={earningsCodes} />
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
}
