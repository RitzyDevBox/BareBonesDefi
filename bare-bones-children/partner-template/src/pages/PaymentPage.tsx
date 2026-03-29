import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { AddressInput } from "../components/Inputs/AddressInput";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { useProcessCurrentPayroll } from "../hooks/payroll/useProcessCurrentPayroll";
import { getBareBonesConfiguration } from "../constants/misc";
import OnboardingManagerABI from "../abis/paymentPipelines/OnboardingManager.abi.json";
import { PayeesTable } from "../components/PayeesTable";
import { PayrollEarningsManager } from "../components/PayrollEarningsManager";
import { ROUTES } from "../routes";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import {
  fetchPayeesWithDefaults,
  fetchOrganizationEarningsCodes,
  type OrganizationEarningsCodeView,
  type PayeeDefaultsView,
} from "../utils/payroll/fetchPayrollViews";
import { shortAddress } from "../utils/formatUtils";

function formatRate(rate: ethers.BigNumber) {
  try {
    return ethers.utils.formatEther(rate);
  } catch {
    return "0";
  }
}

function truncateHex(hex?: string, length = 16) {
  if (!hex || hex === "0x") return "0x";
  if (hex.length <= length) return hex;
  return `${hex.slice(0, length)}…`;
}

function payeeStatusLabel(status?: number) {
  if (status === 0) return "Active";
  if (status === 1) return "On Leave";
  if (status === 2) return "Inactive";
  return `Status ${String(status ?? 0)}`;
}

export function PaymentPage() {
  const { organizationId } = useParams<{ organizationId?: string }>();
  const navigate = useNavigate();
  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();
  const [slug, setSlug] = useState<string>(organizationId ?? "");
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [payeeDefaults, setPayeeDefaults] = useState<PayeeDefaultsView[]>([]);
  const [organizationEarningsCodes, setOrganizationEarningsCodes] = useState<
    OrganizationEarningsCodeView[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStartingPayroll, setIsStartingPayroll] = useState(false);

  // Transfer ownership form
  const [newOwner, setNewOwner] = useState<string>("");

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const onboardingAddress = config?.onboardingManagerAddress;
  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(
    () => new ethers.utils.Interface(OnboardingManagerABI as any),
    []
  );

  const defaultsByPayeeId = useMemo(
    () =>
      new Map(
        payeeDefaults.map((row) => [row.payeeId.toString(), row] as const)
      ),
    [payeeDefaults]
  );

  const earningsCodeById = useMemo(
    () =>
      new Map(
        organizationEarningsCodes.map((row) => [row.earningsCodeId.toString(), row] as const)
      ),
    [organizationEarningsCodes]
  );

  // Auto-refresh org info when version changes (after transaction)
  useEffect(() => {
    if (slug.trim()) {
      fetchOrgInfo(slug.trim());
    }
  }, [version]);

  // If route contains /payments/:organizationId, preload and fetch automatically
  useEffect(() => {
    const slugFromRoute = (organizationId ?? "").trim();
    if (!slugFromRoute) return;

    if (slug !== slugFromRoute) {
      setSlug(slugFromRoute);
    }

    if (provider && onboardingAddress) {
      fetchOrgInfo(slugFromRoute);
    }
  }, [organizationId, provider, onboardingAddress, payrollManagerAddress]);

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
        const [payeeList, defaultsRows, earningsRows] = await Promise.all([
          fetchPayeesByOrganization(provider, onboardingAddress, slugBytes),
          payrollManagerAddress
            ? fetchPayeesWithDefaults(provider, payrollManagerAddress, orgSlug, undefined, account ?? undefined)
            : Promise.resolve([]),
          payrollManagerAddress
            ? fetchOrganizationEarningsCodes(provider, payrollManagerAddress, orgSlug, undefined, account ?? undefined)
            : Promise.resolve([]),
        ]);

        setPayees(payeeList);
        setPayeeDefaults(defaultsRows);
        setOrganizationEarningsCodes(earningsRows);
      } else {
        setPayees([]);
        setPayeeDefaults([]);
        setOrganizationEarningsCodes([]);
      }
    } catch (err) {
      console.error("Error fetching org info:", err);
      setOrgInfo(null);
      setPayees([]);
      setPayeeDefaults([]);
      setOrganizationEarningsCodes([]);
    } finally {
      setLoading(false);
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

  const buildOnboardPayeeTx = useCallback(
    (_: number, orgSlug: string, role: string, address: string) => {
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const roleBytes = ethers.utils.formatBytes32String(role);
      return {
        to: onboardingAddress,
        data: iface.encodeFunctionData("onboardPayee", [
          slugBytes,
          roleBytes,
          address,
          "0x",
        ]),
      } as any;
    },
    [onboardingAddress, iface]
  );

  const onboardPayee = useExecuteRawTx(
    buildOnboardPayeeTx,
    (_: number, __: string, role: string, address: string) =>
      `Onboarded payee "${role}" at ${address}`
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

  const { processCurrentPayroll } = useProcessCurrentPayroll();

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

  async function handleStartPayroll() {
    if (!chainId || !isAdmin || !slug.trim() || isStartingPayroll) return;

    setIsStartingPayroll(true);
    try {
      const chunkLimit = Math.max(1, payees.length * 2);
      await processCurrentPayroll(slug.trim(), 1, chunkLimit);
    } finally {
      setIsStartingPayroll(false);
    }
  }

  return (
    <PageContainer center>
      <Stack gap="lg" style={{ maxWidth: 600 }}>
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
                    <Text.Body color="muted" size="sm">
                      Earnings Catalog: {organizationEarningsCodes.length} code(s) · Defaults Loaded: {payeeDefaults.length} payee(s)
                    </Text.Body>
                    <Row gap="sm" justify="end">
                      {isAdmin && (
                        <ButtonPrimary
                          style={{ flex: 0 }}
                          onClick={handleStartPayroll}
                          disabled={!slug.trim() || isStartingPayroll}
                        >
                          {isStartingPayroll ? "Starting..." : "Start Payroll"}
                        </ButtonPrimary>
                      )}
                      <ButtonSecondary
                        style={{ flex: 0 }}
                        onClick={() => navigate(ROUTES.PAYROLL_CURRENT(slug.trim()))}
                        disabled={!slug.trim()}
                      >
                        Go to Current Payroll
                      </ButtonSecondary>
                    </Row>
                  </Stack>

                  {isAdmin && (
                    <>
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

                      {orgInfo.exists && (
                        <PayrollEarningsManager
                          slug={slug.trim()}
                          canEdit={isAdmin}
                          payees={payees}
                          organizationEarningsCodes={organizationEarningsCodes}
                        />
                      )}
                    </>
                  )}

                  {!orgInfo.exists && (
                    <ButtonPrimary onClick={handleRegisterOrg}>
                      Create Organization
                    </ButtonPrimary>
                  )}

                  {orgInfo.exists && (
                    <PayeesTable
                      payees={payees}
                      searchEnabled={true}
                      extraColumns={[
                        {
                          key: "defaultCodes",
                          header: "Default Codes",
                        },
                        {
                          key: "payeeStatus",
                          header: "Status",
                        },
                      ]}
                      getExtraCells={(payee) => {
                        const payeeId = payee.payeeId.toString();
                        const defaults = defaultsByPayeeId.get(payeeId);
                        return {
                          defaultCodes: defaults?.earnings.length ?? 0,
                          payeeStatus: payeeStatusLabel(defaults?.payeeStatus ?? payee.status),
                        };
                      }}
                      renderExpandedRow={(payee) => {
                        const payeeId = payee.payeeId.toString();
                        const defaults = defaultsByPayeeId.get(payeeId);

                        return (
                          <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
                            <CardContent>
                              <Stack gap="sm">
                                <Text.Label>Payee Default Earnings</Text.Label>
                                {!defaults || defaults.earnings.length === 0 ? (
                                  <Text.Body color="muted">
                                    No default earnings assignments found for this payee.
                                  </Text.Body>
                                ) : (
                                  <Stack gap="sm">
                                    {defaults.earnings.map((earning) => {
                                      const codeId = earning.earningsCodeId.toString();
                                      const codeMeta = earningsCodeById.get(codeId);
                                      const active = codeMeta?.isActive ?? earning.isActive;
                                      return (
                                        <Card key={`${payeeId}-${codeId}`} style={{ border: "1px solid var(--colors-border)" }}>
                                          <CardContent style={{ padding: "var(--spacing-md)" }}>
                                            <Stack gap="xs">
                                              <Row justify="between" wrap>
                                                <Text.Body weight={600}>Code #{codeId}</Text.Body>
                                                <Text.Body color={active ? "success" : "warn"} size="sm">
                                                  {active ? "Active" : "Inactive"}
                                                </Text.Body>
                                              </Row>
                                              <Text.Body size="sm" color="muted">
                                                Rule: {shortAddress(earning.rule)}
                                              </Text.Body>
                                              <Text.Body size="sm" color="muted">
                                                Rate: {formatRate(earning.rate)}
                                              </Text.Body>
                                              <Text.Body size="sm" color="muted">
                                                Config: {truncateHex(earning.config)}
                                              </Text.Body>
                                              <Text.Body size="sm" color="muted">
                                                Run Data: {truncateHex(earning.runData)}
                                              </Text.Body>
                                            </Stack>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </Stack>
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      }}
                      onAddPayee={
                        isAdmin
                          ? {
                              onSubmit: async (role, address) => {
                                await onboardPayee(chainId!, slug, role, address);
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
