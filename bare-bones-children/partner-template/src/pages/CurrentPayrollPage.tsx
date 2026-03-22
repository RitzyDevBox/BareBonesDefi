import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ERC20Mintable } from "../components/ERC20Mintable/ERC20Mintable";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import OnboardingManagerABI from "../abis/paymentPipelines/OnboardingManager.abi.json";
import { EmployeeTable } from "../components/EmployeeTable/EmployeeTable";
import type { OrganizationModel, EmployeeModel } from "../models/payments";

export function CurrentPayrollPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [employees, setEmployees] = useState<EmployeeModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const onboardingAddress = config?.onboardingManagerAddress;

  useEffect(() => {
    if (!slug) return;
    fetchOrgInfo(slug);
  }, [slug, version, provider, onboardingAddress, account]);

  async function fetchOrgInfo(orgSlug: string) {
    if (!provider || !onboardingAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        onboardingAddress,
        OnboardingManagerABI as any,
        provider
      );

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const org = await contract.organizations(slugBytes);

      setOrgInfo({
        owner: org.owner,
        exists: org.exists,
      });

      setIsAdmin(org.exists && org.owner.toLowerCase() === account?.toLowerCase());

      if (org.exists) {
        await fetchEmployees(slugBytes);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error("Error fetching org info:", err);
      setOrgInfo(null);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployees(slugBytes: string) {
    if (!provider || !onboardingAddress) return;

    try {
      const contract = new ethers.Contract(
        onboardingAddress,
        OnboardingManagerABI as any,
        provider
      );

      const total = await contract.totalEmployeesInOrganization(slugBytes);
      const employeeIds = await contract.getEmployeesByOrganizationPaged(
        slugBytes,
        0,
        total.toNumber()
      );

      const employeeList = await Promise.all(
        employeeIds.map((id: ethers.BigNumber) => contract.getEmployee(id))
      );

      setEmployees(employeeList);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  }

  return (
    <PageContainer center>
      <Stack gap="lg" style={{ maxWidth: 600 }}>
        <ERC20Mintable />

        <Card>
          <CardContent>
            <Stack>
              <Text.Title align="left">Current Payroll</Text.Title>

              {!slug && (
                <Text.Body color="warn">
                  Missing organization slug in route.
                </Text.Body>
              )}

              {slug && (
                <Text.Body color="muted">
                  Organization: <strong>{slug}</strong>
                </Text.Body>
              )}

              {loading && <Text.Body color="muted">Loading payroll data...</Text.Body>}

              {orgInfo && (
                <Stack style={{ padding: "var(--spacing-md)", backgroundColor: "var(--colors-background)", borderRadius: "var(--radius-md)" }}>
                  <Text.Body>
                    <strong>Owner:</strong> {orgInfo.owner}
                  </Text.Body>
                  <Text.Body color={isAdmin ? "success" : "muted"}>
                    {isAdmin ? "✓ Admin Mode" : "Read Only Mode"}
                  </Text.Body>
                </Stack>
              )}

              {employees.length > 0 && (
                <EmployeeTable
                  employees={employees}
                  searchEnabled={true}
                  renderExpandedRow={(emp) => (
                    <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
                      <CardContent>
                        <Stack gap="sm">
                          <Text.Label>Current Payroll Override</Text.Label>
                          <Text.Body color="muted">
                            TODO: Implement per-employee payroll override controls for current payroll.
                          </Text.Body>
                          <Text.Body color="muted">
                            Employee ID: {emp.employeeId.toString()}
                          </Text.Body>
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
