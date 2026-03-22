import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { AddressInput } from "../components/Inputs/AddressInput";
import { ERC20Mintable } from "../components/ERC20Mintable/ERC20Mintable";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import OnboardingManagerABI from "../abis/paymentPipelines/OnboardingManager.abi.json";
import { PayrollRuleConfigurator } from "../components/PayrollRuleConfigurator";
import { EmployeeTable } from "../components/EmployeeTable/EmployeeTable";

interface Organization {
  slug: string;
  owner: string;
  exists: boolean;
}

interface Employee {
  employeeId: ethers.BigNumber;
  organizationSlug: string;
  role: string;
  paymentAddress: string;
  params: string;
  status: number;
}

export function PaymentPage() {
  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();
  const [slug, setSlug] = useState<string>("");
  const [orgInfo, setOrgInfo] = useState<Organization | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Transfer ownership form
  const [newOwner, setNewOwner] = useState<string>("");

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const onboardingAddress = config?.onboardingManagerAddress;
  const iface = useMemo(
    () => new ethers.utils.Interface(OnboardingManagerABI as any),
    []
  );

  // Auto-refresh org info when version changes (after transaction)
  useEffect(() => {
    if (slug.trim()) {
      fetchOrgInfo(slug.trim());
    }
  }, [version]);

  // Fetch org info
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
        slug: slugBytes,
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

  // Build transactions
  const buildRegisterOrgTx = useCallback((_: number, orgSlug: string) => {
    const slugBytes = ethers.utils.formatBytes32String(orgSlug);
    return {
      to: onboardingAddress,
      data: iface.encodeFunctionData("registerOrganization", [slugBytes]),
    } as any;
  }, [onboardingAddress, iface]);

  const registerOrg = useExecuteRawTx(
    buildRegisterOrgTx,
    (_: number, orgSlug: string) => `Organization "${orgSlug}" registered`
  );

  const buildOnboardEmployeeTx = useCallback(
    (_: number, orgSlug: string, role: string, address: string) => {
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const roleBytes = ethers.utils.formatBytes32String(role);
      return {
        to: onboardingAddress,
        data: iface.encodeFunctionData("onboardEmployee", [
          slugBytes,
          roleBytes,
          address,
          "0x",
        ]),
      } as any;
    },
    [onboardingAddress, iface]
  );

  const onboardEmployee = useExecuteRawTx(
    buildOnboardEmployeeTx,
    (_: number, __: string, role: string, address: string) =>
      `Onboarded employee "${role}" at ${address}`
  );

  const buildTransferOwnershipTx = useCallback(
    (_: number, orgSlug: string, newOwnerAddr: string) => {
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: onboardingAddress,
        data: iface.encodeFunctionData("updateOwner", [slugBytes, newOwnerAddr]),
      } as any;
    },
    [onboardingAddress, iface]
  );

  const transferOwnership = useExecuteRawTx(
    buildTransferOwnershipTx,
    (_: number, __: string, newOwnerAddr: string) =>
      `Ownership transferred to ${newOwnerAddr}`
  );

  function handleFetchOrg() {
    if (!slug.trim() || !chainId) return;
    fetchOrgInfo(slug.trim());
  }

  function handleRegisterOrg() {
    if (!slug.trim() || !chainId) return;
    registerOrg(chainId, slug.trim());
  }

  async function handleTransferOwnership() {
    if (!newOwner.trim() || !chainId) return;
    await transferOwnership(chainId, slug.trim(), newOwner.trim());
    setNewOwner("");
  }

  return (
    <PageContainer center>
      <Stack gap="lg" style={{ maxWidth: 600 }}>
        <ERC20Mintable />

        <Card>
          <CardContent>
            <Stack>
              <Text.Title>Organization Management</Text.Title>

              <Stack>
                <Text.Label>Organization Slug</Text.Label>
                <Row gap="sm">
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="my-org"
                    style={{ flex: 1 }}
                  />
                  <ButtonSecondary onClick={handleFetchOrg} style={{ width: 120 }}>
                    {loading ? "Loading..." : "Fetch"}
                  </ButtonSecondary>
                </Row>
              </Stack>

              {orgInfo && (
                <>
                  <Stack style={{ padding: "var(--spacing-md)", backgroundColor: "var(--colors-background)", borderRadius: "var(--radius-md)" }}>
                    <Text.Body>
                      <strong>Owner:</strong> {orgInfo.owner}
                    </Text.Body>
                    <Text.Body color={isAdmin ? "success" : "muted"}>
                      {isAdmin ? "✓ Admin Mode" : "Read Only Mode"}
                    </Text.Body>
                  </Stack>

                  {isAdmin && (
                    <Stack>
                      <Text.Label>Transfer Ownership</Text.Label>
                      <Row gap="sm">
                        <AddressInput
                          value={newOwner}
                          onChange={(e) => setNewOwner((e.target as HTMLInputElement).value)}
                          placeholder="0x…"
                          style={{ flex: 1 }}
                        />
                        <ButtonSecondary onClick={handleTransferOwnership} style={{ width: 120 }}>
                          Transfer
                        </ButtonSecondary>
                      </Row>
                    </Stack>
                  )}

                  {!orgInfo.exists && (
                    <ButtonPrimary onClick={handleRegisterOrg}>
                      Create Organization
                    </ButtonPrimary>
                  )}

                  {employees.length > 0 && (
                    <EmployeeTable
                      employees={employees}
                      searchEnabled={true}
                      renderExpandedRow={(emp, rowData) => (
                        <PayrollRuleConfigurator
                          slug={slug}
                          employeeId={emp.employeeId.toNumber()}
                          rowData={rowData}
                          canEdit={isAdmin}
                        />
                      )}
                      onAddEmployee={
                        isAdmin
                          ? {
                              onSubmit: async (role, address) => {
                                await onboardEmployee(chainId!, slug, role, address);
                              },
                              loading: false,
                            }
                          : undefined
                      }
                    />
                  )}
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
