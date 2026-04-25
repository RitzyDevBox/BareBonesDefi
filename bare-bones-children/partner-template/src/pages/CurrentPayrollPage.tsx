import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { SplitActionDropdown } from "../components/Button/SplitActionDropdown";
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
  fetchPayeesWithDefaults,
  fetchPayrollPayeesWithRunData,
  fetchPayrollGrosses,
  type PayeeDefaultsView,
  type OrganizationEarningsCodeView,
  type PayrollPayeeRunDataView,
  type PayrollGrossView,
} from "../utils/payroll/fetchPayrollViews";
import { shortAddress } from "../utils/formatUtils";
import { formatPeriodHour } from "../utils/payroll/payrollStatusDisplay";
import { ROUTES } from "../routes";
import {
  formatAmountDisplay,
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
  const location = useLocation();
  const navigate = useNavigate();
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
  const [templatePayeeDefaults, setTemplatePayeeDefaults] = useState<PayeeDefaultsView[]>([]);
  const [organizationEarningsCodes, setOrganizationEarningsCodes] = useState<
    OrganizationEarningsCodeView[]
  >([]);
  const [isPreviewingPayroll, setIsPreviewingPayroll] = useState(false);
  const [previewGrossByPayeeId, setPreviewGrossByPayeeId] = useState<Record<string, string>>({});
  const [previewTotalGross, setPreviewTotalGross] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isCancellingPayroll, setIsCancellingPayroll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean((location.state as { isAdmin?: boolean } | null)?.isAdmin));
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

  // Accumulate payroll run data across refreshes so that re-added payees (who
  // were previously removed and are no longer in the live run data) still show
  // their on-chain earnings. The cache is reset whenever the active payroll ID
  // changes, so it never leaks stale data across different payrolls.
  const payrollRunCacheRef = useRef<Map<string, PayrollPayeeRunDataView>>(new Map());
  const cachedPayrollIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentPayrollId !== cachedPayrollIdRef.current) {
      payrollRunCacheRef.current = new Map();
      cachedPayrollIdRef.current = currentPayrollId;
    }
    for (const row of payrollPayeeRunData) {
      payrollRunCacheRef.current.set(row.payeeId.toString(), row);
    }
  }, [currentPayrollId, payrollPayeeRunData]);

  const isViewOnly = payrollStatus === PayrollStatus.Finalized || payrollStatus === PayrollStatus.Cancelled;

  const templateDefaultsByPayeeId = useMemo(
    () => new Map(templatePayeeDefaults.map((row) => [row.payeeId.toString(), row] as const)),
    [templatePayeeDefaults]
  );

  const earningsCodeNameById = useMemo(
    () =>
      new Map(
        organizationEarningsCodes.map((code) => [code.earningsCodeId.toString(), code.name] as const)
      ),
    [organizationEarningsCodes]
  );

  const payeeIdsInPayroll = useMemo(
    () => new Set(payrollPayeeRunData.map((row) => row.payeeId.toString())),
    [payrollPayeeRunData]
  );

  const payeeById = useMemo(
    () => new Map(payees.map((p) => [p.payeeId.toString(), p])),
    [payees]
  );

  const { hasStagedChanges, stagedCount, isApplying: isApplyingStaged } = stagingMeta;

  const finalizedTotalGross = useMemo(() => {
    if (!finalizedGrosses.length) return null;
    const total = finalizedGrosses.reduce(
      (acc, row) => acc.add(ethers.BigNumber.from(row.gross)),
      ethers.BigNumber.from(0)
    );
    return formatAmountDisplay(ethers.utils.formatEther(total));
  }, [finalizedGrosses]);

  const totalGrossDisplay = payrollStatus === PayrollStatus.Finalized
    ? (finalizedTotalGross ?? "-")
    : (previewTotalGross ?? "-");

  const resetPayrollState = useCallback(() => {
    setCurrentPayrollId(null);
    setPayrollPayeeRunData([]);
    setTemplatePayeeDefaults([]);
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
    const navIsAdmin = (location.state as { isAdmin?: boolean } | null)?.isAdmin;
    if (typeof navIsAdmin === "boolean") {
      setIsAdmin(navIsAdmin);
    }
  }, [location.state]);

  useEffect(() => {
    if (!slug) return;
    fetchOrgInfo(slug);
  }, [slug, version, provider, payrollManagerAddress, account, requestedPayrollId]);

  async function fetchOrgInfo(orgSlug: string) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    setOrgInfo(null);
    setIsAdmin(false);
    setPayees([]);
    resetPayrollState();
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

      if (parsedRun.templateCode && parsedRun.templateCode !== ethers.constants.HashZero) {
        try {
          const defaults = await fetchPayeesWithDefaults(
            provider,
            payrollManagerAddress,
            orgSlug,
            parsedRun.templateCode
          );
          setTemplatePayeeDefaults(defaults);
        } catch (defaultsErr) {
          console.warn("Failed to fetch template payee defaults:", defaultsErr);
          setTemplatePayeeDefaults([]);
        }
      } else {
        setTemplatePayeeDefaults([]);
      }

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
      hasStagedChanges
    ) return;

    // Match on-chain validation:
    // if (endTime < startTime || periodSeconds % 1 hours != 0) revert InvalidPayrollWindow();
    if (payrollStartTime == null || payrollEndTime == null) {
      setPreviewError("Invalid payroll window: missing start or end time.");
      return;
    }

    const periodSeconds = payrollEndTime - payrollStartTime;
    if (payrollEndTime < payrollStartTime || periodSeconds % 3600 !== 0) {
      setPreviewError("Invalid payroll window. The payroll duration must be non-negative and aligned to full-hour boundaries.");
      return;
    }

    setPreviewError(null);
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
      const fallbackMessage =
        "Preview failed. Check payroll window settings (start/end) and ensure duration is aligned to whole hours.";
      const message =
        (err as any)?.reason ||
        (err as any)?.errorName ||
        (err as any)?.error?.message ||
        (err as any)?.message ||
        fallbackMessage;
      setPreviewError(String(message));
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

        <div className="bb-prl-detail-back">
          <button
            className="bb-btn-ghost bb-btn-xs"
            onClick={() => navigate(`${ROUTES.PAYMENTS_ORG(slug)}?tab=payrolls`)}
            disabled={!slug}
          >
            ← All payrolls
          </button>
          {payrollId && <span className="bb-muted bb-small">/ Payroll #{payrollId}</span>}
        </div>

        {!slug && (
          <Text.Body color="warn">Missing organization slug in route.</Text.Body>
        )}

        {!!slug && (loading || (orgInfo?.exists && currentPayrollId !== null)) && (() => {
          const tone =
            payrollStatus === PayrollStatus.Draft
              ? "draft"
              : payrollStatus === PayrollStatus.Processing || payrollStatus === PayrollStatus.Processed
                ? "info"
                : payrollStatus === PayrollStatus.Finalizing
                  ? "warn"
                  : payrollStatus === PayrollStatus.Finalized
                    ? "ok"
                    : payrollStatus === PayrollStatus.Cancelled
                      ? "error"
                      : "draft";
          return (
            <div className={`bb-pr-status-card bb-pr-status-${tone}`}>
              <div className="bb-pr-status-l">
                <div className="bb-kicker">Cycle</div>
                <div className="bb-pr-status-cycle">Payroll #{payrollId ?? "—"}</div>
                <div className="bb-muted bb-small">
                  {formatPeriodHour(payrollStartTime)} → {formatPeriodHour(payrollEndTime)}
                </div>
              </div>
              <div className="bb-pr-status-m">
                <div className="bb-kicker">Status</div>
                <span className={`bb-status bb-status-${tone}`}>
                  {payrollStatus == null ? "N/A" : payrollStatusLabel(payrollStatus)}
                </span>
                <div className="bb-muted bb-small">
                  {payrollStatus === PayrollStatus.Draft && "Open for edits."}
                  {payrollStatus === PayrollStatus.Processing && "Processing on-chain."}
                  {payrollStatus === PayrollStatus.Processed && "Processing complete — finalize next."}
                  {payrollStatus === PayrollStatus.Finalizing && "Finalizing transfers."}
                  {payrollStatus === PayrollStatus.Finalized && "All transfers processed."}
                  {payrollStatus === PayrollStatus.Cancelled && "Cancelled — no payouts sent."}
                </div>
              </div>
              <div className="bb-pr-status-r">
                <div className="bb-kicker">Batch template</div>
                <div className="bb-pr-status-total bb-mono">{parseBatchCodeLabel(payrollTemplateCode)}</div>
                {loading && <span className="bb-muted bb-small"><span className="bb-spinner bb-sm" /> Loading…</span>}
              </div>
              <div className="bb-pr-status-actions" />
            </div>
          );
        })()}

        {!!slug && (loading || (orgInfo?.exists && currentPayrollId !== null)) && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Stack gap="md">
                {payrollStatus === PayrollStatus.Finalized && !loading ? (
                  <Stack gap="sm">
                    <Text.Label>Finalized Payment Summary</Text.Label>
                    {finalizedGrosses.length === 0 ? (
                      <Text.Body color="muted">No payout records found.</Text.Body>
                    ) : (
                      <Table
                        loading={loading}
                        loadingLabel="Loading payroll summary..."
                        showSearch={false}
                        columns={[
                          { key: "payeeId", header: "ID", width: "80px" },
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
                    loading={loading}
                    payees={payees}
                    baseIncludedPayeeIds={payeeIdsInPayroll}
                    canEdit={isAdmin && !isViewOnly && currentPayrollId != null}
                    headerActions={
                      <SplitActionDropdown
                        label={isPreviewingPayroll ? "Previewing..." : "Preview"}
                        onPrimaryClick={handlePreviewPayroll}
                        primaryDisabled={currentPayrollId == null || isPreviewingPayroll || hasStagedChanges}
                        actions={[
                          {
                            label: isCancellingPayroll ? "Cancelling..." : "Cancel",
                            onClick: handleCancelPayroll,
                            disabled: !isAdmin || !slug || isCancellingPayroll || isProcessingPayroll || currentPayrollId == null || isViewOnly || hasStagedChanges,
                          },
                          {
                            label: isPreviewingPayroll ? "Previewing..." : "Preview",
                            onClick: handlePreviewPayroll,
                            disabled: currentPayrollId == null || isPreviewingPayroll || hasStagedChanges,
                          },
                          {
                            label: isProcessingPayroll ? "Processing..." : "Process",
                            onClick: handleOpenProcessFlow,
                            disabled: !isAdmin || !slug || isProcessingPayroll || currentPayrollId == null || isViewOnly || hasStagedChanges,
                          },
                        ]}
                      />
                    }
                    extraColumns={[
                      ...(showResolvedCodesColumn ? [{ key: "resolvedCodes", header: "Codes" }] : []),
                      ...(screenSize === ScreenSize.Phone ? [] : [{ key: "payeeStatus", header: "Status" }]),
                      {
                        key: "previewGross",
                        header: screenSize === ScreenSize.Phone ? "Gross" : "Preview Gross",
                        width: screenSize === ScreenSize.Phone ? "88px" : undefined,
                      },
                    ]}
                    getExtraCells={(payee) => {
                      const payeeId = payee.payeeId.toString();
                      const row = payrollRunByPayeeId.get(payeeId);
                      const fullPreviewGross = previewGrossByPayeeId[payeeId] ?? "-";
                      const compactPreviewGross = screenSize === ScreenSize.Phone
                        ? fullPreviewGross.split(" ")[0]
                        : fullPreviewGross;
                      return {
                        resolvedCodes: row?.earnings.length ?? 0,
                        previewGross: compactPreviewGross,
                        payeeStatus: payeeStatusLabel(row?.payeeStatus ?? payee.status),
                      };
                    }}
                    formatAddPayeeLabel={(payee) =>
                      `${parsePayeeNameLabel(payee.role)} · ${shortAddress(payee.paymentAddress)}`
                    }
                    addableEmptyMessage="All organization payees are already in this payroll."
                    addSelectMinWidth={showResolvedCodesColumn ? 320 : 220}
                    addSelectCompact={true}
                    disableAddPayee={isApplyingStaged}
                    panelTitle="Payroll Resolved Earnings"
                    panelAddLabel="+ Add Additional"
                    getOnChainEarnings={(payee) => {
                      const payeeId = payee.payeeId.toString();
                      // Fall back to cached data for payees who were removed then
                      // re-added — the contract restores their batch earnings on apply.
                      const payeeRunData =
                        payrollRunByPayeeId.get(payeeId) ??
                        payrollRunCacheRef.current.get(payeeId);
                      const resolvedEarnings = payeeRunData?.earnings;

                      const templateFallbackEarnings =
                        (templateDefaultsByPayeeId.get(payeeId)?.earnings ?? []).map((earning) => {
                          const codeId = earning.earningsCodeId.toString();
                          return {
                            earningsCodeId: earning.earningsCodeId,
                            name: earningsCodeNameById.get(codeId),
                            rule: earning.rule,
                            rate: earning.rate,
                            config: earning.config,
                            runData: earning.runData,
                            source: 0,
                          };
                        });

                      const effectiveEarnings =
                        resolvedEarnings && resolvedEarnings.length > 0
                          ? resolvedEarnings
                          : templateFallbackEarnings;

                      return effectiveEarnings;
                    }}
                    earningsCodes={organizationEarningsCodes}
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
                    disableApply={loading}
                  />
                )}

                {previewError && (
                  <Text.Body color="warn" size="sm">
                    {previewError}
                  </Text.Body>
                )}
                {isViewOnly && (
                  <Text.Body color="warn" size="sm">
                    This payroll is finalized/cancelled and is currently view-only.
                  </Text.Body>
                )}
                {hasStagedChanges && (
                  <Text.Body color="warn" size="sm">
                    Staged edits: {stagedCount} pending. Clear or apply staged changes before preview/process.
                  </Text.Body>
                )}

                <Row
                  justify="between"
                  align="center"
                  wrap
                  style={{
                    paddingTop: "var(--spacing-sm)",
                    borderTop: "1px solid var(--colors-border)",
                  }}
                >
                  <Text.Body size="sm" color="muted">Total Payees: {payrollPayeeRunData.length}</Text.Body>
                  <Text.Body size="sm" color="muted">Total Gross: {totalGrossDisplay}</Text.Body>
                </Row>
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
