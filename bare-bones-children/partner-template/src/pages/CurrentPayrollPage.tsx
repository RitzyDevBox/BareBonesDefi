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
import { useMtaState } from "../hooks/auth/useMtaState";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { PAYROLL_ADMIN_ROLE_SLUGS } from "../constants/mtaRoles";
import { ScreenSize, useMediaQuery } from "../hooks/useMediaQuery";
import { getBareBonesConfiguration } from "../constants/misc";
import { PayeeStatus, PayrollStatus, payeeStatusLabel, payrollStatusLabel } from "../constants/payroll";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import PayrollTreasuryABI from "../abis/paymentPipelines/PayrollTreasury.abi.json";
import { Table } from "../components/Table";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { useProcessCurrentPayroll } from "../hooks/payroll/useProcessCurrentPayroll";
import { usePayrollActions } from "../hooks/payroll/usePayrollActions";
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
import { orgSlugFor } from "../utils/payroll/orgSlug";
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
  // Optimistic seed from the nav state when arriving from PaymentPage.
  // Once `orgInfo` + `mtaState.members` populate, `isAdmin` below derives
  // the real value from on-chain ownership OR an MTA role assignment.
  const navInitialIsAdmin = Boolean(
    (location.state as { isAdmin?: boolean } | null)?.isAdmin,
  );
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [payrollStatus, setPayrollStatus] = useState<number | null>(null);
  const [finalizedGrosses, setFinalizedGrosses] = useState<PayrollGrossView[]>([]);
  const [payrollTemplateCode, setPayrollTemplateCode] = useState<string>(ethers.constants.HashZero);
  const [payrollStartTime, setPayrollStartTime] = useState<number | null>(null);
  const [payrollEndTime, setPayrollEndTime] = useState<number | null>(null);
  const [isProcessFlowOpen, setIsProcessFlowOpen] = useState(false);
  const [processFlowError, setProcessFlowError] = useState<string | null>(null);
  const [treasuryFundingCheck, setTreasuryFundingCheck] = useState<{
    shortfallWei: ethers.BigNumber;
    treasuryWei: ethers.BigNumber;
    expectedWei: ethers.BigNumber;
  } | null>(null);
  const [stagingMeta, setStagingMeta] = useState({
    hasStagedChanges: false,
    stagedCount: 0,
    isApplying: false,
  });

  const { processCurrentPayroll } = useProcessCurrentPayroll(slug);

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

  // Pre-finalize treasury check: when the user opens the process flow modal and
  // the payroll is already past Process (i.e. the next step is Finalize), pull
  // the locked-in grosses + treasury balance and surface any shortfall so the
  // modal can block the Continue action with a clear message.
  useEffect(() => {
    if (!isProcessFlowOpen) {
      setTreasuryFundingCheck(null);
      return;
    }
    if (
      !provider ||
      !payrollManagerAddress ||
      !slug ||
      currentPayrollId == null ||
      (payrollStatus !== PayrollStatus.Processed && payrollStatus !== PayrollStatus.Finalizing)
    ) {
      setTreasuryFundingCheck(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
        const slugBytes = orgSlugFor(slug);

        const treasuryAddress: string = await manager.treasury();
        if (!treasuryAddress || treasuryAddress === ethers.constants.AddressZero) {
          if (!cancelled) setTreasuryFundingCheck(null);
          return;
        }

        const treasury = new ethers.Contract(treasuryAddress, PayrollTreasuryABI as any, provider);
        const treasuryBal: ethers.BigNumber = await treasury.balanceOf(slugBytes);

        const grosses = await fetchPayrollGrosses(
          provider,
          payrollManagerAddress,
          slug,
          currentPayrollId,
        );
        const expectedWei = grosses.reduce(
          (acc, row) => acc.add(ethers.BigNumber.from(row.gross)),
          ethers.BigNumber.from(0),
        );

        const shortfallWei = expectedWei.gt(treasuryBal)
          ? expectedWei.sub(treasuryBal)
          : ethers.BigNumber.from(0);

        if (!cancelled) {
          setTreasuryFundingCheck({ shortfallWei, treasuryWei: treasuryBal, expectedWei });
        }
      } catch (err) {
        console.error("Failed to check treasury funding:", err);
        if (!cancelled) setTreasuryFundingCheck(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isProcessFlowOpen, payrollStatus, provider, payrollManagerAddress, slug, currentPayrollId, version]);

  const treasuryShortfall = useMemo(() => {
    if (!treasuryFundingCheck) return null;
    if (treasuryFundingCheck.shortfallWei.isZero()) return null;
    return {
      shortfall: formatAmountDisplay(ethers.utils.formatEther(treasuryFundingCheck.shortfallWei)),
      treasury: formatAmountDisplay(ethers.utils.formatEther(treasuryFundingCheck.treasuryWei)),
      expected: formatAmountDisplay(ethers.utils.formatEther(treasuryFundingCheck.expectedWei)),
    };
  }, [treasuryFundingCheck]);

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

  // MTA state for this slug so the admin gate covers PayrollOperator / Admin /
  // SuperAdmin role holders, not just the legacy org-owner fast path. See the
  // matching gate in [PaymentPage](./PaymentPage.tsx).
  const slugBytes = useMemo(() => (slug ? orgSlugFor(slug) : ""), [slug]);
  // All operator-surface writes route through MTA.execute via this hook.
  // Direct calls to PayrollManager only authorize the slug owner via the
  // stateless PayrollSlugAuthorityResolver — PayrollOperator role holders
  // get NotAuthorized() unless the call goes MTA → PayrollManager.
  const payrollActions = usePayrollActions(slugBytes);
  const mtaState = useMtaState(slugBytes);

  const isAdmin = useMemo(() => {
    if (!account) return navInitialIsAdmin;
    if (orgInfo?.exists && orgInfo.owner.toLowerCase() === account.toLowerCase()) {
      return true;
    }
    const me = mtaState.members.find(
      (m) => m.wallet.address.toLowerCase() === account.toLowerCase(),
    );
    if (me && me.roles.some((r) => PAYROLL_ADMIN_ROLE_SLUGS.has(r))) return true;
    return navInitialIsAdmin && !orgInfo;
  }, [account, orgInfo, mtaState.members, navInitialIsAdmin]);

  useEffect(() => {
    if (!slug) return;
    fetchOrgInfo(slug);
  }, [slug, version, provider, payrollManagerAddress, account, requestedPayrollId]);

  async function fetchOrgInfo(orgSlug: string) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    setOrgInfo(null);
    setPayees([]);
    resetPayrollState();
    try {
      const contract = new ethers.Contract(
        payrollManagerAddress,
        PayrollManagerABI as any,
        provider
      );

      const orgSlugBytes = orgSlugFor(orgSlug);
      const org = await contract.organizations(orgSlugBytes);

      setOrgInfo({
        owner: org.owner,
        exists: org.exists,
      });

      if (!org.exists) {
        setPayees([]);
        resetPayrollState();
        return;
      }

      const payeeList = await fetchPayeesByOrganization(provider, payrollManagerAddress, slugBytes, chainId ?? undefined);
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
      await processCurrentPayroll(currentPayrollId, 1, chunkLimit);
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
      const tx = await payrollActions.cancelPayroll(currentPayrollId);
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
      const slugBytes = orgSlugFor(slug);

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
                <div className="bb-kicker">Batch template</div>
                <div className="bb-pr-status-total bb-mono">{parseBatchCodeLabel(payrollTemplateCode)}</div>
                {loading && <span className="bb-muted bb-small"><span className="bb-spinner bb-sm" /> Loading…</span>}
              </div>
              <div className="bb-pr-status-r">
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
                              name: payee ? parsePayeeNameLabel(payee.nameSlug) : `Payee #${gross.payeeId.toString()}`,
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
                        compact={screenSize === ScreenSize.Phone}
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
                        header: "Gross",
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
                      `${parsePayeeNameLabel(payee.nameSlug)} · ${shortAddress(payee.paymentAddress)}`
                    }
                    addableEmptyMessage="All organization payees are already in this payroll."
                    addSelectMinWidth={showResolvedCodesColumn ? 320 : 220}
                    addSelectCompact={true}
                    disableAddPayee={isApplyingStaged}
                    panelTitle="Payroll Resolved Earnings"
                    panelAddLabel="Add Additional"
                    getPanelHeaderBadge={
                      // The Status column is hidden from the table on phone; surface
                      // the colored pill in the panel header there. On tablet/desktop
                      // the column already shows it, so we don't double-up.
                      screenSize === ScreenSize.Phone
                        ? (payee) => {
                            const row = payrollRunByPayeeId.get(payee.payeeId.toString());
                            const status = (row?.payeeStatus ?? payee.status) as
                              | number
                              | undefined;
                            const tone =
                              status === PayeeStatus.Active
                                ? "ok"
                                : status === PayeeStatus.OnLeave
                                  ? "warn"
                                  : status === PayeeStatus.Inactive
                                    ? "error"
                                    : "draft";
                            return (
                              <span className={`bb-status bb-status-${tone}`}>
                                {payeeStatusLabel(status)}
                              </span>
                            );
                          }
                        : undefined
                    }
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
                      const tx = await payrollActions.configurePayroll(
                        currentPayrollId,
                        actions.map((a) => ({
                          action: a.action as 0 | 1,
                          payeeId: a.payeeId,
                          earningsCodeIds: a.earningsCodeIds,
                          rates: a.rates,
                          runData: a.runData,
                        })),
                      );
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
          treasuryShortfall={treasuryShortfall}
        />

      </Stack>
    </PageContainer>
  );
}
