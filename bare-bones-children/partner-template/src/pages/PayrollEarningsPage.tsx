import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useLocation, useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { Loader } from "../components/Loader/Loader";
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
  const location = useLocation();
  const { organizationId } = useParams<{ organizationId: string }>();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [loading, setLoading] = useState(false);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean((location.state as { isAdmin?: boolean } | null)?.isAdmin));
  const [earningsCodes, setEarningsCodes] = useState<OrganizationEarningsCodeView[]>([]);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;

  async function refresh(orgSlug: string) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    setOrgInfo(null);
    setIsAdmin(false);
    setEarningsCodes([]);
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
        orgSlug
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
    const navIsAdmin = (location.state as { isAdmin?: boolean } | null)?.isAdmin;
    if (typeof navIsAdmin === "boolean") {
      setIsAdmin(navIsAdmin);
    }
  }, [location.state]);

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
              <PayrollNavigation slug={slug} active="earnings" title="Earnings Management" isAdmin={isAdmin} />

              {!slug && <Text.Body color="warn">Missing organization slug in route.</Text.Body>}

              {slug && (
                <Text.Body color="muted">
                  Organization: <strong>{slug}</strong>
                </Text.Body>
              )}

              {loading && <Loader label="Loading earnings..." />}


            </Stack>
          </CardContent>
        </Card>

        {!!slug && (loading || orgInfo?.exists) && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <PayrollEarningsManager slug={slug} canEdit={isAdmin} earningsCodes={earningsCodes} loading={loading} />
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
}
