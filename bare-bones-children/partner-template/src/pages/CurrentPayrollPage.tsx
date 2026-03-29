import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { ERC20Mintable } from "../components/ERC20Mintable/ERC20Mintable";
import { PayrollTreasuryFund } from "../components/PayrollTreasuryFund/PayrollTreasuryFund";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import OnboardingManagerABI from "../abis/paymentPipelines/OnboardingManager.abi.json";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import { PayeesTable } from "../components/PayeesTable";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { useProcessCurrentPayroll } from "../hooks/payroll/useProcessCurrentPayroll";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import {
  fetchLatestPayrollId,
  fetchPayrollPayeesWithRunData,
  type PayrollPayeeRunDataView,
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

function sourceLabel(source: number) {
  if (source === 1) return "Override";
  if (source === 2) return "Additional";
  return "Default";
}

function sourceColor(source: number): "main" | "secondary" | "label" | "muted" | "danger" | "warn" | "success" {
  if (source === 1) return "warn";
  if (source === 2) return "success";
  return "secondary";
}

export function CurrentPayrollPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [currentPayrollId, setCurrentPayrollId] = useState<number | null>(null);
  const [payrollPayeeRunData, setPayrollPayeeRunData] = useState<PayrollPayeeRunDataView[]>([]);
  const [isPreviewingPayroll, setIsPreviewingPayroll] = useState(false);
  const [previewGrossByPayeeId, setPreviewGrossByPayeeId] = useState<Record<string, string>>({});
  const [previewTotalGross, setPreviewTotalGross] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);

  const { processCurrentPayroll } = useProcessCurrentPayroll();

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const onboardingAddress = config?.onboardingManagerAddress;
  const payrollManagerAddress = config?.payrollManagerAddress;

  const payrollRunByPayeeId = useMemo(
    () =>
      new Map(
        payrollPayeeRunData.map((row) => [row.payeeId.toString(), row] as const)
      ),
    [payrollPayeeRunData]
  );

  useEffect(() => {
    if (!slug) return;
    fetchOrgInfo(slug);
  }, [slug, version, provider, onboardingAddress, payrollManagerAddress, account]);

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
        const payeeList = await fetchPayeesByOrganization(provider, onboardingAddress, slugBytes);
        setPayees(payeeList);

        if (payrollManagerAddress) {
          const latestPayrollId = await fetchLatestPayrollId(
            provider,
            payrollManagerAddress,
            orgSlug,
            account ?? undefined
          );

          setCurrentPayrollId(latestPayrollId);

          if (latestPayrollId !== null) {
            const runDataRows = await fetchPayrollPayeesWithRunData(
              provider,
              payrollManagerAddress,
              orgSlug,
              latestPayrollId,
              undefined,
              account ?? undefined
            );
            setPayrollPayeeRunData(runDataRows);
          } else {
            setPayrollPayeeRunData([]);
          }
        } else {
          setCurrentPayrollId(null);
          setPayrollPayeeRunData([]);
        }
      } else {
        setPayees([]);
        setCurrentPayrollId(null);
        setPayrollPayeeRunData([]);
      }
    } catch (err) {
      console.error("Error fetching org info:", err);
      setOrgInfo(null);
      setPayees([]);
      setCurrentPayrollId(null);
      setPayrollPayeeRunData([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessPayroll() {
    if (!slug || !isAdmin || isProcessingPayroll) return;

    setIsProcessingPayroll(true);
    try {
      const chunkLimit = Math.max(1, payees.length * 2);
      await processCurrentPayroll(slug, 1, chunkLimit);
    } finally {
      setIsProcessingPayroll(false);
    }
  }

  async function handlePreviewPayroll() {
    if (!provider || !payrollManagerAddress || !slug || currentPayrollId == null || isPreviewingPayroll) return;

    setIsPreviewingPayroll(true);
    try {
      const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const slugBytes = ethers.utils.formatBytes32String(slug);
      const latestBlock = await provider.getBlock("latest");
      const processTimestamp = latestBlock?.timestamp ?? Math.floor(Date.now() / 1000);
      const callOverrides = account ? ({ from: account } as ethers.CallOverrides) : undefined;

      let cursor = 0;
      const limit = Math.max(1, payees.length * 2);
      let hasMore = true;
      const grossByPayeeId: Record<string, string> = {};
      let totalGross = ethers.BigNumber.from(0);

      while (hasMore) {
        const res = callOverrides
          ? await manager.previewPayrollChunk(
              slugBytes,
              currentPayrollId,
              cursor,
              limit,
              processTimestamp,
              callOverrides
            )
          : await manager.previewPayrollChunk(
              slugBytes,
              currentPayrollId,
              cursor,
              limit,
              processTimestamp
            );

        const rows: Array<{ payeeId: ethers.BigNumber; gross: ethers.BigNumber }> = res?.rows ?? res?.[0] ?? [];
        const chunkGross: ethers.BigNumber = res?.chunkGross ?? res?.[1] ?? ethers.BigNumber.from(0);
        const nextCursor: ethers.BigNumber = res?.nextCursor ?? res?.[2] ?? ethers.BigNumber.from(cursor);
        const nextHasMore: boolean = Boolean(res?.hasMore ?? res?.[3]);

        for (const row of rows) {
          grossByPayeeId[row.payeeId.toString()] = ethers.utils.formatEther(row.gross);
        }

        totalGross = totalGross.add(chunkGross);
        cursor = nextCursor.toNumber();
        hasMore = nextHasMore;
      }

      // Fallback path: some statuses may return empty preview chunks.
      // In that case, derive gross per payee from roster + getPayrollGross.
      if (Object.keys(grossByPayeeId).length === 0) {
        const roster: ethers.BigNumber[] = callOverrides
          ? await manager.getPayrollRoster(slugBytes, currentPayrollId, callOverrides)
          : await manager.getPayrollRoster(slugBytes, currentPayrollId);
        let rosterTotal = ethers.BigNumber.from(0);

        for (const payeeId of roster) {
          const gross: ethers.BigNumber = callOverrides
            ? await manager.getPayrollGross(
                slugBytes,
                currentPayrollId,
                payeeId,
                callOverrides
              )
            : await manager.getPayrollGross(
                slugBytes,
                currentPayrollId,
                payeeId
              );
          grossByPayeeId[payeeId.toString()] = ethers.utils.formatEther(gross);
          rosterTotal = rosterTotal.add(gross);
        }

        totalGross = rosterTotal;
      }

      setPreviewGrossByPayeeId(grossByPayeeId);
      setPreviewTotalGross(ethers.utils.formatEther(totalGross));
    } catch (err) {
      console.error("Error previewing payroll:", err);
      setPreviewGrossByPayeeId({});
      setPreviewTotalGross(null);
    } finally {
      setIsPreviewingPayroll(false);
    }
  }

  return (
    <PageContainer center>
      <Stack gap="lg" style={{ maxWidth: 600 }}>
        <ERC20Mintable />

        {slug && (
          <PayrollTreasuryFund
            organizationSlug={slug}
            disabled={!isAdmin}
          />
        )}

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
                  <Text.Body color="muted" size="sm">
                    Payroll ID: {currentPayrollId !== null ? currentPayrollId : "N/A"} · Loaded payees: {payrollPayeeRunData.length}
                  </Text.Body>
                  {previewTotalGross != null && (
                    <Text.Body color="secondary" size="sm">
                      Preview Total Gross: {previewTotalGross}
                    </Text.Body>
                  )}
                  <Row gap="sm" justify="end">
                    <ButtonSecondary
                      style={{ flex: 0 }}
                      onClick={handlePreviewPayroll}
                      disabled={currentPayrollId == null || isPreviewingPayroll}
                    >
                      {isPreviewingPayroll ? "Previewing..." : "Preview Payroll"}
                    </ButtonSecondary>
                    <ButtonPrimary
                      style={{ flex: 0 }}
                      onClick={handleProcessPayroll}
                      disabled={!isAdmin || !slug || isProcessingPayroll}
                    >
                      {isProcessingPayroll ? "Processing..." : "Process Payroll"}
                    </ButtonPrimary>
                  </Row>
                </Stack>
              )}

              {payees.length > 0 && (
                <PayeesTable
                  payees={payees}
                  searchEnabled={true}
                  extraColumns={[
                    {
                      key: "resolvedCodes",
                      header: "Resolved Codes",
                    },
                    {
                      key: "previewGross",
                      header: "Preview Gross",
                    },
                    {
                      key: "payeeStatus",
                      header: "Status",
                    },
                  ]}
                  getExtraCells={(payee) => {
                    const payeeId = payee.payeeId.toString();
                    const row = payrollRunByPayeeId.get(payeeId);
                    return {
                      resolvedCodes: row?.earnings.length ?? 0,
                      previewGross: previewGrossByPayeeId[payeeId] ?? "-",
                      payeeStatus: payeeStatusLabel(row?.payeeStatus ?? payee.status),
                    };
                  }}
                  renderExpandedRow={(payee) => (
                    <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
                      <CardContent>
                        <Stack gap="sm">
                          <Text.Label>Current Payroll Resolved Earnings</Text.Label>
                          {(() => {
                            const payeeId = payee.payeeId.toString();
                            const payeeRunData = payrollRunByPayeeId.get(payeeId);
                            return currentPayrollId === null ? (
                              <Text.Body color="muted">
                                No payroll has been created for this organization yet.
                              </Text.Body>
                            ) : !payeeRunData ? (
                              <Text.Body color="muted">
                                This payee is not included in payroll #{currentPayrollId}.
                              </Text.Body>
                            ) : (
                              <Stack gap="sm">
                                {payeeRunData.earnings.map((earning, index) => (
                                  <Card key={`${payeeId}-${earning.earningsCodeId.toString()}-${index}`} style={{ border: "1px solid var(--colors-border)" }}>
                                    <CardContent style={{ padding: "var(--spacing-md)" }}>
                                      <Stack gap="xs">
                                        <Row justify="between" wrap>
                                          <Text.Body weight={600}>
                                            Code #{earning.earningsCodeId.toString()}
                                          </Text.Body>
                                          <Text.Body color={sourceColor(earning.source)} size="sm">
                                            {sourceLabel(earning.source)}
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
                                ))}
                              </Stack>
                            );
                          })()}
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
