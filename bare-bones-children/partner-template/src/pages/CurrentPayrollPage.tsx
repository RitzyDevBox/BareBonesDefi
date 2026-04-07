import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { ScreenSize, useMediaQuery } from "../hooks/useMediaQuery";
import { getBareBonesConfiguration } from "../constants/misc";
import { PayrollStatus, payeeStatusLabel, payrollStatusLabel } from "../constants/payroll";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import { Table } from "../components/Table";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { useProcessCurrentPayroll } from "../hooks/payroll/useProcessCurrentPayroll";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import {
  fetchOrganizationEarningsCodes,
  fetchPayrollPayeesWithRunData,
  fetchPayrollGrosses,
  type OrganizationEarningsCodeView,
  type PayrollPayeeRunDataView,
  type PayrollGrossView,
} from "../utils/payroll/fetchPayrollViews";
import { shortAddress } from "../utils/formatUtils";
import { PayrollNavigation } from "../components/PayrollNavigation";
import {
  formatAmountDisplay,
  formatDateTime,
  parseBatchCodeLabel,
  parsePreviewPayrollChunk,
  parsePayrollRunRow,
  parsePayeeNameLabel,
} from "../utils/payroll/payrollFormatters";
import {
  PayrollEarningsStagingSection,
  ProcessPayrollFlowModal,
  type PayrollConfigActionPayload,
} from "../components/PayrollStagingManager";

export function CurrentPayrollPage() {
  const { organizationId, payrollId } = useParams<{ organizationId: string; payrollId?: string }>();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();
  const screenSize = useMediaQuery();
  const showResolvedCodesColumn = screenSize === ScreenSize.Desktop;

  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [currentPayrollId, setCurrentPayrollId] = useState<number | null>(null);
  const [payrollPayeeRunData, setPayrollPayeeRunData] = useState<PayrollPayeeRunDataView[]>([]);
  const [organizationEarningsCodes, setOrganizationEarningsCodes] = useState<
    OrganizationEarningsCodeView[]
  >([]);
  const [isPreviewingPayroll, setIsPreviewingPayroll] = useState(false);
  const [previewGrossByPayeeId, setPreviewGrossByPayeeId] = useState<Record<string, string>>({});
  const [previewTotalGross, setPreviewTotalGross] = useState<string | null>(null);
  const [isCancellingPayroll, setIsCancellingPayroll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [payrollStatus, setPayrollStatus] = useState<number | null>(null);
  const [finalizedGrosses, setFinalizedGrosses] = useState<PayrollGrossView[]>([]);
  const [payrollTemplateCode, setPayrollTemplateCode] = useState<string>(ethers.constants.HashZero);
  const [payrollStartTime, setPayrollStartTime] = useState<number | null>(null);
  const [payrollEndTime, setPayrollEndTime] = useState<number | null>(null);
  const [isProcessFlowOpen, setIsProcessFlowOpen] = useState(false);
  const [processFlowError, setProcessFlowError] = useState<string | null>(null);
  const [stagingMeta, setStagingMeta] = useState({
    hasStagedChanges: false,
    stagedCount: 0,
    isApplying: false,
  });

  const { processCurrentPayroll } = useProcessCurrentPayroll();

  const requestedPayrollId = useMemo(() => {
    const raw = (payrollId ?? "").trim();
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.floor(parsed);
  }, [payrollId]);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const payrollInterface = useMemo(
    () => new ethers.utils.Interface(PayrollManagerABI as any),
    []
  );

  const payrollRunByPayeeId = useMemo(
    () =>
      new Map(
        payrollPayeeRunData.map((row) => [row.payeeId.toString(), row] as const)
      ),
    [payrollPayeeRunData]
  );

  const earningsCodeById = useMemo(
    () =>
      new Map(
        organizationEarningsCodes.map((row) => [row.earningsCodeId.toString(), row] as const)
      ),
    [organizationEarningsCodes]
  );

  const activeOrganizationEarningsCodes = useMemo(
    () =>
      organizationEarningsCodes.filter((row) => {
        if (!row.isActive) return false;
        if (!config?.weeklyScheduleRuleAddress) return true;
        return row.rule.toLowerCase() !== config.weeklyScheduleRuleAddress.toLowerCase();
      }),
    [organizationEarningsCodes, config]
  );

  const isViewOnly = payrollStatus === PayrollStatus.Finalized || payrollStatus === PayrollStatus.Cancelled;
  const isPreviewDisabledByStatus = (payrollStatus ?? PayrollStatus.None) >= PayrollStatus.Processed;
  const payeeIdsInPayroll = useMemo(
    () => new Set(payrollPayeeRunData.map((row) => row.payeeId.toString())),
    [payrollPayeeRunData]
  );

  const payeeById = useMemo(
    () => new Map(payees.map((p) => [p.payeeId.toString(), p])),
    [payees]
  );

  const { hasStagedChanges, stagedCount, isApplying: isApplyingStaged } = stagingMeta;

  const resetPayrollState = useCallback(() => {
    setCurrentPayrollId(null);
    setPayrollPayeeRunData([]);
    setOrganizationEarningsCodes([]);
    setPayrollStatus(null);
    setPayrollTemplateCode(ethers.constants.HashZero);
    setPayrollStartTime(null);
    setPayrollEndTime(null);
    setFinalizedGrosses([]);
  }, []);

  const buildConfigurePayrollTx = useCallback(
    (
      _: number,
      orgSlug: string,
      payrollId: number,
      actions: PayrollConfigActionPayload[]
    ) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address missing");
      }

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: payrollManagerAddress,
        data: payrollInterface.encodeFunctionData("configurePayroll", [slugBytes, payrollId, actions]),
      } as any;
    },
    [payrollManagerAddress, payrollInterface]
  );

  const configurePayroll = useExecuteRawTx(
    buildConfigurePayrollTx,
    (_: number, orgSlug: string, payrollId: number, actions: PayrollConfigActionPayload[]) =>
      `Configured payroll ${payrollId} for ${orgSlug} (${actions.length} staged changes)`
  );

  const cancelPayroll = useExecuteRawTx(
    (_: number, orgSlug: string, payrollId: number) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address missing");
      }

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: payrollManagerAddress,
        data: payrollInterface.encodeFunctionData("cancelPayroll", [slugBytes, payrollId]),
      } as any;
    },
    (_: number, orgSlug: string, payrollId: number) =>
      `Cancelled payroll ${payrollId} for ${orgSlug}`
  );

  useEffect(() => {
    if (!slug) return;
    fetchOrgInfo(slug);
  }, [slug, version, provider, payrollManagerAddress, account, requestedPayrollId]);

  async function fetchOrgInfo(orgSlug: string) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        payrollManagerAddress,
        PayrollManagerABI as any,
        provider
      );

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const org = await contract.organizations(slugBytes);

      setOrgInfo({
        owner: org.owner,
        exists: org.exists,
      });

      setIsAdmin(org.exists && org.owner.toLowerCase() === account?.toLowerCase());

      if (!org.exists) {
        setPayees([]);
        resetPayrollState();
        return;
      }

      const payeeList = await fetchPayeesByOrganization(provider, payrollManagerAddress, slugBytes);
      setPayees(payeeList);

      const [earningRows, orgMap] = await Promise.all([
        fetchOrganizationEarningsCodes(
          provider,
          payrollManagerAddress,
          orgSlug,
        ),
        contract.slugToOrgInfoMap(slugBytes),
      ]);

      setOrganizationEarningsCodes(earningRows);

      const nextPayrollId = Number((orgMap?.nextPayrollId ?? orgMap?.[0] ?? ethers.BigNumber.from(0)).toString());
      const latestPayrollId = nextPayrollId > 0 ? nextPayrollId - 1 : null;
      const targetPayrollId = requestedPayrollId ?? latestPayrollId;

      setCurrentPayrollId(targetPayrollId);

      if (targetPayrollId === null) {
        resetPayrollState();
        return;
      }

      const run = await contract.slugToPayrollToRunMap(slugBytes, targetPayrollId);
      const parsedRun = parsePayrollRunRow(targetPayrollId, run, undefined);
      const fetchedStatus = parsedRun.status;
      setPayrollStatus(fetchedStatus);
      setPayrollTemplateCode(parsedRun.templateCode);
      setPayrollStartTime(parsedRun.startTime);
      setPayrollEndTime(parsedRun.endTime);

      const runDataRows = await fetchPayrollPayeesWithRunData(
        provider,
        payrollManagerAddress,
        orgSlug,
        targetPayrollId,
      );
      setPayrollPayeeRunData(runDataRows);

      if (fetchedStatus === PayrollStatus.Finalized) {
        const grosses = await fetchPayrollGrosses(
          provider,
          payrollManagerAddress,
          orgSlug,
          targetPayrollId,
      );
        setFinalizedGrosses(grosses);
      } else {
        setFinalizedGrosses([]);
      }
    } catch (err) {
      console.error("Error fetching org info:", err);
      setOrgInfo(null);
      setPayees([]);
      resetPayrollState();
    } finally {
      setLoading(false);
    }
  }

  function handleOpenProcessFlow() {
    if (!slug || !isAdmin || currentPayrollId == null || hasStagedChanges || isViewOnly) return;
    setProcessFlowError(null);
    setIsProcessFlowOpen(true);
  }

  async function handleProcessPayroll() {
    if (!slug || !isAdmin || isProcessingPayroll || currentPayrollId == null || hasStagedChanges || isViewOnly) return;

    setIsProcessingPayroll(true);
    setProcessFlowError(null);
    try {
      const chunkLimit = Math.max(1, payees.length * 2);
      await processCurrentPayroll(slug, currentPayrollId, 1, chunkLimit);
      await fetchOrgInfo(slug);
    } catch (err: any) {
      const message =
        err?.reason ||
        err?.error?.message ||
        err?.data?.message ||
        err?.message ||
        "Payroll processing failed";
      setProcessFlowError(String(message));
    } finally {
      setIsProcessingPayroll(false);
    }
  }

  async function handleCancelPayroll() {
    if (!slug || !isAdmin || currentPayrollId == null || hasStagedChanges || isViewOnly || isCancellingPayroll) return;
    if (!chainId) return;

    setIsCancellingPayroll(true);
    try {
      const tx = await cancelPayroll(chainId, slug, currentPayrollId);
      if (tx !== undefined) {
        await fetchOrgInfo(slug);
      }
    } finally {
      setIsCancellingPayroll(false);
    }
  }

  async function handlePreviewPayroll() {
    if (
      !provider ||
      !payrollManagerAddress ||
      !slug ||
      currentPayrollId == null ||
      isPreviewingPayroll ||
      hasStagedChanges ||
      isPreviewDisabledByStatus
    ) return;

    setIsPreviewingPayroll(true);
    try {
      const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const slugBytes = ethers.utils.formatBytes32String(slug);

      let cursor = 0;
      const limit = Math.max(1, payees.length * 2);
      let hasMore = true;
      const grossByPayeeId: Record<string, string> = {};
      let totalGross = ethers.BigNumber.from(0);

      while (hasMore) {
        const res = await manager.previewPayrollChunk(
          slugBytes,
          currentPayrollId,
          cursor,
          limit
        );

        const { rows, chunkGross, nextCursor, hasMore: nextHasMore } = parsePreviewPayrollChunk(res, cursor);

        for (const row of rows) {
          grossByPayeeId[row.payeeId.toString()] = formatAmountDisplay(ethers.utils.formatEther(row.gross));
        }

        totalGross = totalGross.add(chunkGross);
        cursor = nextCursor.toNumber();
        hasMore = nextHasMore;
      }

      // Fallback path: some statuses may return empty preview chunks.
      // In that case, derive gross per payee from roster + getPayrollGross.
      if (Object.keys(grossByPayeeId).length === 0) {
        const roster: ethers.BigNumber[] = await manager.getPayrollRoster(slugBytes, currentPayrollId);
        let rosterTotal = ethers.BigNumber.from(0);

        for (const payeeId of roster) {
          const gross: ethers.BigNumber = await manager.getPayrollGross(
            slugBytes,
            currentPayrollId,
            payeeId
          );
          grossByPayeeId[payeeId.toString()] = formatAmountDisplay(ethers.utils.formatEther(gross));
          rosterTotal = rosterTotal.add(gross);
        }

        totalGross = rosterTotal;
      }

      setPreviewGrossByPayeeId(grossByPayeeId);
      setPreviewTotalGross(formatAmountDisplay(ethers.utils.formatEther(totalGross)));
    } catch (err) {
      console.error("Error previewing payroll:", err);
      setPreviewGrossByPayeeId({});
      setPreviewTotalGross(null);
    } finally {
      setIsPreviewingPayroll(false);
    }
  }

  return (
    <PageContainer center maxWidth={1440}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Row gap="sm" wrap style={{ width: "100%", alignItems: "stretch", justifyContent: "center" }}>
          <div style={{ flex: "0 1 440px", width: "100%", maxWidth: 460, minWidth: 320, display: "flex" }}>
            <ERC20Mintable />
          </div>

          {slug && (
            <div style={{ flex: "0 1 440px", width: "100%", maxWidth: 460, minWidth: 320, display: "flex" }}>
              <PayrollTreasuryFund
                organizationSlug={slug}
                disabled={!isAdmin}
              />
            </div>
          )}
        </Row>

        <Card style={{ width: "100%", maxWidth: 860, alignSelf: "center" }}>
          <CardContent>
            <Stack>
              <PayrollNavigation slug={slug} active="payrolls" title="Payroll Details" />

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
                  <Text.Body color="muted" size="sm">
                    Status: {payrollStatus == null ? "N/A" : payrollStatusLabel(payrollStatus)}
                  </Text.Body>
                  <Text.Body color="muted" size="sm">
                    Template: {parseBatchCodeLabel(payrollTemplateCode)}
                  </Text.Body>
                  <Text.Body color="muted" size="sm">
                    Window: {payrollStartTime ? formatDateTime(payrollStartTime) : "-"} → {payrollEndTime ? formatDateTime(payrollEndTime) : "-"}
                  </Text.Body>
                  {stagedCount > 0 && (
                    <Text.Body color="warn" size="sm">
                      Staged edits: {stagedCount} pending
                    </Text.Body>
                  )}
                  {hasStagedChanges && (
                    <Text.Body color="warn" size="sm">
                      Clear or apply staged changes before Preview or Process.
                    </Text.Body>
                  )}
                  {isViewOnly && (
                    <Text.Body color="warn" size="sm">
                      This payroll is finalized/cancelled and is currently view-only.
                    </Text.Body>
                  )}
                  {previewTotalGross != null && (
                    <Text.Body color="secondary" size="sm">
                      Preview Total Gross: {previewTotalGross}
                    </Text.Body>
                  )}
                  <Row gap="sm" justify="end">
                    <ButtonSecondary
                      style={{ flex: 0 }}
                      onClick={handleCancelPayroll}
                      disabled={!isAdmin || !slug || isCancellingPayroll || isProcessingPayroll || currentPayrollId == null || isViewOnly || hasStagedChanges}
                    >
                      {isCancellingPayroll ? "Cancelling..." : "Cancel Payroll"}
                    </ButtonSecondary>
                    <ButtonSecondary
                      style={{ flex: 0 }}
                      onClick={handlePreviewPayroll}
                      disabled={currentPayrollId == null || isPreviewingPayroll || hasStagedChanges || isPreviewDisabledByStatus}
                    >
                      {isPreviewingPayroll ? "Previewing..." : "Preview Payroll"}
                    </ButtonSecondary>
                    <ButtonPrimary
                      style={{ flex: 0 }}
                      onClick={handleOpenProcessFlow}
                      disabled={!isAdmin || !slug || isProcessingPayroll || currentPayrollId == null || isViewOnly || hasStagedChanges}
                    >
                      {isProcessingPayroll ? "Processing..." : "Process Payroll"}
                    </ButtonPrimary>
                  </Row>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {orgInfo?.exists && currentPayrollId !== null && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Stack gap="md">
                {payrollStatus === PayrollStatus.Finalized ? (
                  <Stack gap="sm">
                    <Text.Label>Finalized Payment Summary</Text.Label>
                    {finalizedGrosses.length === 0 ? (
                      <Text.Body color="muted">No payout records found.</Text.Body>
                    ) : (
                      <Table
                        showSearch={false}
                        columns={[
                          { key: "payeeId", header: "#", width: "80px" },
                          { key: "name", header: "Name" },
                          { key: "paidAmount", header: "Paid Amount" },
                        ]}
                        data={finalizedGrosses.map((gross) => {
                          const payee = payeeById.get(gross.payeeId.toString());
                          return {
                            id: gross.payeeId.toString(),
                            cells: {
                              payeeId: gross.payeeId.toString(),
                              name: payee ? parsePayeeNameLabel(payee.role) : `Payee #${gross.payeeId.toString()}`,
                              paidAmount: formatAmountDisplay(ethers.utils.formatEther(gross.gross)),
                            },
                          };
                        })}
                      />
                    )}
                  </Stack>
                ) : (
                  <PayrollEarningsStagingSection
                    payees={payees}
                    baseIncludedPayeeIds={payeeIdsInPayroll}
                    canEdit={isAdmin && !isViewOnly && currentPayrollId != null}
                    searchEnabled={true}
                    extraColumns={[
                      ...(showResolvedCodesColumn ? [{ key: "resolvedCodes", header: "Codes" }] : []),
                      { key: "payeeStatus", header: "Status" },
                      { key: "previewGross", header: "Preview Gross" },
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
                    formatAddPayeeLabel={(payee) =>
                      `#${payee.payeeId.toString()} · ${parsePayeeNameLabel(payee.role)} · ${shortAddress(payee.paymentAddress)}`
                    }
                    addPayeeButtonLabel="+ Add Payee"
                    addableEmptyMessage="All organization payees are already in this payroll."
                    addSectionMaxWidth={560}
                    addSelectMinWidth={showResolvedCodesColumn ? 320 : 220}
                    addSelectCompact={true}
                    disableAddPayee={isApplyingStaged}
                    panelTitle="Payroll Resolved Earnings"
                    panelAddLabel="+ Add Additional"
                    getOnChainEarnings={(payee) => {
                      const payeeRunData = payrollRunByPayeeId.get(payee.payeeId.toString());
                      return (payeeRunData?.earnings ?? []).filter((earning) => {
                        if (!config?.weeklyScheduleRuleAddress) return true;
                        return earning.rule.toLowerCase() !== config.weeklyScheduleRuleAddress.toLowerCase();
                      });
                    }}
                    earningsCodeById={earningsCodeById}
                    activeEarningsCodes={activeOrganizationEarningsCodes}
                    config={config}
                    onSave={async (actions) => {
                      if (!chainId || !slug || currentPayrollId == null) return false;
                      const tx = await configurePayroll(chainId, slug, currentPayrollId, actions);
                      return tx !== undefined;
                    }}
                    onAfterApply={async () => {
                      setPreviewGrossByPayeeId({});
                      setPreviewTotalGross(null);
                      await fetchOrgInfo(slug);
                    }}
                    onStagingMetaChange={setStagingMeta}
                    disableApply={isApplyingStaged}
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        <ProcessPayrollFlowModal
          isOpen={isProcessFlowOpen}
          onClose={() => setIsProcessFlowOpen(false)}
          onContinue={handleProcessPayroll}
          isProcessing={isProcessingPayroll}
          currentPayrollId={currentPayrollId}
          payrollStatus={payrollStatus}
          processFlowError={processFlowError}
          payrollStatusLabel={payrollStatusLabel}
        />

      </Stack>
    </PageContainer>
  );
}
