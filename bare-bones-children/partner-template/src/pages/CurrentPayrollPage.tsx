import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { Modal } from "../components/Modal/Modal";
import { Select, SelectOption } from "../components/Select";
import { NumberInput } from "../components/Inputs/NumberInput";
import { CopyButton } from "../components/Button/Actions/CopyButton";
import { IconButton } from "../components/Button/IconButton";
import { ERC20Mintable } from "../components/ERC20Mintable/ERC20Mintable";
import { PayrollTreasuryFund } from "../components/PayrollTreasuryFund/PayrollTreasuryFund";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { ScreenSize, useMediaQuery } from "../hooks/useMediaQuery";
import { getBareBonesConfiguration } from "../constants/misc";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import { PayeesTable } from "../components/PayeesTable";
import { Table } from "../components/Table";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { useProcessCurrentPayroll } from "../hooks/payroll/useProcessCurrentPayroll";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import {
  fetchOrganizationEarningsCodes,
  fetchPayrollPayeesWithRunData,
  fetchPayrollGrosses,
  type OrganizationEarningsCodeView,
  type PayrollResolvedEarningView,
  type PayrollPayeeRunDataView,
  type PayrollGrossView,
} from "../utils/payroll/fetchPayrollViews";
import { shortAddress } from "../utils/formatUtils";
import { PayrollNavigation } from "../components/PayrollNavigation";
import { TrashBinIcon } from "../assets/icons/TrashBinIcon";
import { EditableEarningsPanel } from "../components/PayrollEarningsManager";
import {
  formatAmountDisplay,
  formatDateTime,
  formatRate,
  parseBatchCodeLabel,
  parsePayeeNameLabel,
} from "../utils/payroll/payrollFormatters";
import {
  buildRuleMeta,
  decodeConfigDisplay,
} from "../utils/payroll/earningsDisplay";
import {
  formatEarningsCodeIdLabel,
  formatEarningsCodeName,
} from "../utils/payroll/earningsCodeDisplay";
import {
  usePayrollStagingManager,
  PayrollConfigActionKind,
  ProcessPayrollFlowModal,
  type PayrollConfigActionPayload,
} from "../components/PayrollStagingManager";

enum PayeeStatus {
  Active = 0,
  OnLeave = 1,
  Inactive = 2,
}

enum CurrentPayrollEarningsMode {
  View = "view",
  Override = "override",
  Additional = "additional",
}

enum PayrollStatus {
  None = 0,
  Draft = 1,
  Processing = 2,
  Processed = 3,
  Finalizing = 4,
  Finalized = 5,
  Cancelled = 6,
}

function payeeStatusLabel(status?: number) {
  switch (status) {
    case PayeeStatus.Active:
      return "Active";
    case PayeeStatus.OnLeave:
      return "On Leave";
    case PayeeStatus.Inactive:
      return "Inactive";
    default:
      return `Status ${String(status ?? 0)}`;
  }
}

function payrollStatusLabel(status?: number) {
  if (status === PayrollStatus.Draft) return "Draft";
  if (status === PayrollStatus.Processing) return "Processing";
  if (status === PayrollStatus.Processed) return "Processed";
  if (status === PayrollStatus.Finalizing) return "Finalizing";
  if (status === PayrollStatus.Finalized) return "Finalized";
  if (status === PayrollStatus.Cancelled) return "Cancelled";
  return "None";
}


interface CurrentPayrollEarningsModalState {
  isOpen: boolean;
  mode: CurrentPayrollEarningsMode;
  payee: PayeeModel | null;
  earning: PayrollResolvedEarningView | null;
}

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
  const [selectedManagePayeeId, setSelectedManagePayeeId] = useState<string>("");
  const [isProcessFlowOpen, setIsProcessFlowOpen] = useState(false);
  const [processFlowError, setProcessFlowError] = useState<string | null>(null);
  const [earningsModal, setEarningsModal] = useState<CurrentPayrollEarningsModalState>({
    isOpen: false,
    mode: CurrentPayrollEarningsMode.View,
    payee: null,
    earning: null,
  });
  const [modalCodeId, setModalCodeId] = useState("");
  const [modalRate, setModalRate] = useState("0");
  const [modalHourlyRunData, setModalHourlyRunData] = useState("40");
  const [modalRawRunData, setModalRawRunData] = useState("0x");

  const { processCurrentPayroll } = useProcessCurrentPayroll();

  const stagingManager = usePayrollStagingManager(async (actions) => {
    if (!chainId || !slug || currentPayrollId == null) return false;
    const tx = await configurePayroll(chainId, slug, currentPayrollId, actions);
    return tx !== undefined;
  });

  const {
    stagedActions,
    setStagedActions,
    isApplying: isApplyingStaged,
    hasStagedChanges,
    stagedPayeeRemovals,
    stagedPayeeAdditions,
    stagedEarningRemovals,
    stagedEarningUpserts,
    stageAction,
    clearStaged,
  } = stagingManager;

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

  const selectedModalCode = useMemo(
    () => (modalCodeId ? earningsCodeById.get(modalCodeId) ?? null : null),
    [modalCodeId, earningsCodeById]
  );

  const selectedModalRule =
    selectedModalCode?.rule ?? earningsModal.earning?.rule ?? ethers.constants.AddressZero;
  const selectedModalRuleMeta = useMemo(
    () => buildRuleMeta(selectedModalRule, config),
    [selectedModalRule, config]
  );

  const isViewOnly = payrollStatus === PayrollStatus.Finalized || payrollStatus === PayrollStatus.Cancelled;
  const isPreviewDisabledByStatus = (payrollStatus ?? PayrollStatus.None) >= PayrollStatus.Processed;
  const payeeIdsInPayroll = useMemo(
    () => new Set(payrollPayeeRunData.map((row) => row.payeeId.toString())),
    [payrollPayeeRunData]
  );

  const addablePayees = useMemo(
    () => payees.filter((payee) => !payeeIdsInPayroll.has(payee.payeeId.toString())),
    [payees, payeeIdsInPayroll]
  );

  const payrollPayees = useMemo(
    () => payees.filter((payee) => payeeIdsInPayroll.has(payee.payeeId.toString())),
    [payees, payeeIdsInPayroll]
  );

  const payeeById = useMemo(
    () => new Map(payees.map((p) => [p.payeeId.toString(), p])),
    [payees]
  );

  const effectiveDisplayPayees = useMemo(
    () => [
      ...payrollPayees,
      ...addablePayees.filter((p) => stagedPayeeAdditions.has(p.payeeId.toString())),
    ],
    [payrollPayees, addablePayees, stagedPayeeAdditions]
  );

  const additionalModalCodes = useMemo(() => {
    if (earningsModal.mode !== CurrentPayrollEarningsMode.Additional || !earningsModal.payee) {
      return [] as OrganizationEarningsCodeView[];
    }

    const payeeId = earningsModal.payee.payeeId.toString();
    const takenCodeIds = new Set<string>();

    for (const earning of payrollRunByPayeeId.get(payeeId)?.earnings ?? []) {
      takenCodeIds.add(earning.earningsCodeId.toString());
    }

    for (const codeId of stagedEarningUpserts.get(payeeId)?.keys() ?? []) {
      takenCodeIds.add(codeId);
    }

    const filtered = activeOrganizationEarningsCodes.filter(
      (row) => !takenCodeIds.has(row.earningsCodeId.toString())
    );

    if (modalCodeId) {
      const selected = activeOrganizationEarningsCodes.find(
        (row) => row.earningsCodeId.toString() === modalCodeId
      );
      if (selected && !filtered.some((row) => row.earningsCodeId.eq(selected.earningsCodeId))) {
        return [selected, ...filtered];
      }
    }

    return filtered;
  }, [
    earningsModal.mode,
    earningsModal.payee,
    payrollRunByPayeeId,
    stagedEarningUpserts,
    activeOrganizationEarningsCodes,
    modalCodeId,
  ]);

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

  useEffect(() => {
    if (selectedManagePayeeId && addablePayees.some((row) => row.payeeId.toString() === selectedManagePayeeId)) {
      return;
    }
    const first = addablePayees[0]?.payeeId?.toString() ?? "";
    setSelectedManagePayeeId(first);
  }, [selectedManagePayeeId, addablePayees]);

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

      if (org.exists) {
        const payeeList = await fetchPayeesByOrganization(provider, payrollManagerAddress, slugBytes);
        setPayees(payeeList);

        if (payrollManagerAddress) {
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

          if (targetPayrollId !== null) {
            const run = await contract.slugToPayrollToRunMap(slugBytes, targetPayrollId);
            const fetchedStatus = Number(run?.status ?? run?.[0] ?? 0);
            setPayrollStatus(fetchedStatus);
            setPayrollTemplateCode(String(run?.templateCode ?? run?.[1] ?? ethers.constants.HashZero));
            setPayrollStartTime(Number((run?.startTime ?? run?.[2] ?? 0).toString()));
            setPayrollEndTime(Number((run?.endTime ?? run?.[3] ?? 0).toString()));

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
          } else {
            resetPayrollState();
          }
        } else {
          resetPayrollState();
        }
      } else {
        setPayees([]);
        resetPayrollState();
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

        const rows: Array<{ payeeId: ethers.BigNumber; gross: ethers.BigNumber }> = res?.rows ?? res?.[0] ?? [];
        const chunkGross: ethers.BigNumber = res?.chunkGross ?? res?.[1] ?? ethers.BigNumber.from(0);
        const nextCursor: ethers.BigNumber = res?.nextCursor ?? res?.[2] ?? ethers.BigNumber.from(cursor);
        const nextHasMore: boolean = Boolean(res?.hasMore ?? res?.[3]);

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

  async function handleAddPayeeToPayroll() {
    if (!slug || currentPayrollId == null || !selectedManagePayeeId) return;

    // Guard: already on payroll or already staged for addition
    if (payeeIdsInPayroll.has(selectedManagePayeeId) || stagedPayeeAdditions.has(selectedManagePayeeId)) return;

    stageAction(`Add payee #${selectedManagePayeeId} to payroll roster`, {
      action: PayrollConfigActionKind.Upsert,
      payeeId: ethers.BigNumber.from(selectedManagePayeeId),
      earningsCodeIds: [],
      rates: [],
      runData: [],
    });
  }

  async function handleRemovePayeeFromPayroll(payeeIdRaw: string) {
    if (!slug || currentPayrollId == null || !payeeIdRaw) return;

    if (stagedPayeeAdditions.has(payeeIdRaw)) {
      setStagedActions((prev) =>
        prev.filter(
          (a) =>
            !(
              a.payload.payeeId.toString() === payeeIdRaw &&
              (
                (a.payload.action === PayrollConfigActionKind.Upsert && a.payload.earningsCodeIds.length === 0) ||
                a.payload.earningsCodeIds.length > 0
              )
            )
        )
      );
      return;
    }

    if (stagedPayeeRemovals.has(payeeIdRaw)) {
      setStagedActions((prev) =>
        prev.filter(
          (a) =>
            !(
              a.payload.action === PayrollConfigActionKind.Remove &&
              a.payload.earningsCodeIds.length === 0 &&
              a.payload.payeeId.toString() === payeeIdRaw
            )
        )
      );
      return;
    }

    // If payee removal is staged, any staged earning upserts/removals for that payee are redundant.
    setStagedActions((prev) =>
      prev.filter(
        (a) =>
          !(
            a.payload.payeeId.toString() === payeeIdRaw &&
            a.payload.earningsCodeIds.length > 0
          )
      )
    );

    stageAction(`Remove payee #${payeeIdRaw} from payroll roster`, {
      action: PayrollConfigActionKind.Remove,
      payeeId: ethers.BigNumber.from(payeeIdRaw),
      earningsCodeIds: [],
      rates: [],
      runData: [],
    });
  }

  function handleStageRemoveEarning(payeeIdRaw: string, earningsCodeIdRaw: string) {
    if (!payeeIdRaw || !earningsCodeIdRaw) return;

    if (stagedEarningUpserts.get(payeeIdRaw)?.has(earningsCodeIdRaw)) {
      setStagedActions((prev) =>
        prev.filter(
          (a) =>
            !(
              a.payload.action === PayrollConfigActionKind.Upsert &&
              a.payload.payeeId.toString() === payeeIdRaw &&
              a.payload.earningsCodeIds.some((id) => id.toString() === earningsCodeIdRaw)
            )
        )
      );
      return;
    }

    if (stagedEarningRemovals.get(payeeIdRaw)?.has(earningsCodeIdRaw)) {
      setStagedActions((prev) =>
        prev.filter(
          (a) =>
            !(
              a.payload.action === PayrollConfigActionKind.Remove &&
              a.payload.payeeId.toString() === payeeIdRaw &&
              a.payload.earningsCodeIds.some((id) => id.toString() === earningsCodeIdRaw)
            )
        )
      );
      return;
    }

    stageAction(
      `Remove earning code ${formatEarningsCodeIdLabel(earningsCodeIdRaw)} for payee #${payeeIdRaw}`,
      {
        action: PayrollConfigActionKind.Remove,
        payeeId: ethers.BigNumber.from(payeeIdRaw),
        earningsCodeIds: [ethers.BigNumber.from(earningsCodeIdRaw)],
        rates: [],
        runData: [],
      }
    );
  }

  async function handleApplyStagedChanges() {
    if (!isApplyingStaged) {
      const success = await stagingManager.applyStagedChanges();
      if (success) {
        setPreviewGrossByPayeeId({});
        setPreviewTotalGross(null);
      }
    }
  }

  useEffect(() => {
    if (!earningsModal.isOpen) return;

    const earning = earningsModal.earning;
    if (earning) {
      setModalCodeId(earning.earningsCodeId.toString());
      setModalRate(formatRate(earning.rate));
      setModalRawRunData(earning.runData || "0x");

      try {
        const ruleMeta = buildRuleMeta(earning.rule, config);
        if (ruleMeta.kind === "hourly" && earning.runData && earning.runData !== "0x") {
          const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], earning.runData);
          setModalHourlyRunData(String(Number((decoded?.[0] as ethers.BigNumber).toString())));
        } else {
          setModalHourlyRunData("40");
        }
      } catch {
        setModalHourlyRunData("40");
      }
      return;
    }

    const firstCode = activeOrganizationEarningsCodes[0]?.earningsCodeId?.toString() ?? "";
    setModalCodeId(firstCode);
    setModalRate("0");
    setModalRawRunData("0x");
    setModalHourlyRunData("40");
  }, [earningsModal, activeOrganizationEarningsCodes, config]);

  function openEarningsModal(
    mode: CurrentPayrollEarningsMode,
    payee: PayeeModel,
    earning: PayrollResolvedEarningView | null = null
  ) {
    setEarningsModal({
      isOpen: true,
      mode,
      payee,
      earning,
    });
  }

  function closeEarningsModal() {
    setEarningsModal({
      isOpen: false,
      mode: CurrentPayrollEarningsMode.View,
      payee: null,
      earning: null,
    });
  }

  function openEditStagedAdditional(
    payee: PayeeModel,
    codeId: string,
    staged: { rate: ethers.BigNumberish; runData: string }
  ) {
    setEarningsModal({
      isOpen: true,
      mode: CurrentPayrollEarningsMode.Additional,
      payee,
      earning: null,
    });

    setModalCodeId(codeId);
    try {
      setModalRate(ethers.utils.formatEther(staged.rate));
    } catch {
      setModalRate("0");
    }

    setModalRawRunData(staged.runData || "0x");

    try {
      const code = earningsCodeById.get(codeId);
      const ruleMeta = buildRuleMeta(code?.rule ?? ethers.constants.AddressZero, config);
      if (ruleMeta.kind === "hourly" && staged.runData && staged.runData !== "0x") {
        const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], staged.runData);
        setModalHourlyRunData(String(Number((decoded?.[0] as ethers.BigNumber).toString())));
      } else {
        setModalHourlyRunData("40");
      }
    } catch {
      setModalHourlyRunData("40");
    }
  }

  function resolveModalRunData() {
    if (selectedModalRuleMeta.kind === "hourly") {
      return ethers.utils.defaultAbiCoder.encode(["uint32"], [Math.max(0, Math.floor(Number(modalHourlyRunData) || 0))]);
    }

    if (selectedModalRuleMeta.kind === "custom") {
      return modalRawRunData?.trim() || "0x";
    }

    return "0x";
  }

  async function handleSubmitCurrentPayrollEarning() {
    if (!chainId || currentPayrollId == null || !earningsModal.payee || !slug || isViewOnly) return;

    const payeeId = earningsModal.payee.payeeId.toString();
    if (stagedPayeeRemovals.has(payeeId)) return;

    const runData = resolveModalRunData();

    if (earningsModal.mode === CurrentPayrollEarningsMode.Override) {
      const codeId = earningsModal.earning?.earningsCodeId.toString() ?? modalCodeId;
      if (!codeId) return;

      setStagedActions((prev) => {
        const filtered = prev.filter(
          (a) =>
            !(
              a.payload.payeeId.toString() === payeeId &&
              a.payload.earningsCodeIds.some((id) => id.toString() === codeId)
            )
        );

        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        return [
          ...filtered,
          {
            id,
            label: `Upsert earning code ${formatEarningsCodeIdLabel(codeId)} for payee #${payeeId}`,
            payload: {
              action: PayrollConfigActionKind.Upsert,
              payeeId: ethers.BigNumber.from(payeeId),
              earningsCodeIds: [ethers.BigNumber.from(codeId)],
              rates: [ethers.utils.parseEther(modalRate || "0")],
              runData: [runData],
            },
          },
        ];
      });
      closeEarningsModal();
      return;
    }

    if (earningsModal.mode === CurrentPayrollEarningsMode.Additional) {
      if (!selectedModalCode) return;

      const selectedCodeId = selectedModalCode.earningsCodeId.toString();
      setStagedActions((prev) => {
        const filtered = prev.filter(
          (a) =>
            !(
              a.payload.payeeId.toString() === payeeId &&
              a.payload.earningsCodeIds.some((id) => id.toString() === selectedCodeId)
            )
        );

        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        return [
          ...filtered,
          {
            id,
            label: `Add/Upsert earning code ${formatEarningsCodeIdLabel(selectedModalCode.earningsCodeId)} for payee #${payeeId}`,
            payload: {
              action: PayrollConfigActionKind.Upsert,
              payeeId: ethers.BigNumber.from(payeeId),
              earningsCodeIds: [selectedModalCode.earningsCodeId],
              rates: [ethers.utils.parseEther(modalRate || "0")],
              runData: [runData],
            },
          },
        ];
      });
      closeEarningsModal();
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
                  {stagedActions.length > 0 && (
                    <Text.Body color="warn" size="sm">
                      Staged edits: {stagedActions.length} pending
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
                              paidAmount: ethers.utils.formatEther(gross.gross),
                            },
                          };
                        })}
                      />
                    )}
                  </Stack>
                ) : (
                  <PayeesTable
                    payees={effectiveDisplayPayees}
                    searchEnabled={true}
                    extraColumns={[
                      ...(showResolvedCodesColumn
                        ? [{ key: "resolvedCodes", header: "Codes" }]
                        : []),
                      { key: "payeeStatus", header: "Status" },
                      { key: "previewGross", header: "Preview Gross" },
                      ...(isAdmin && !isViewOnly
                        ? [
                            {
                              key: "removeAction",
                              header: "",
                              allowOverflow: true,
                              render: (payeeIdStr: string) => {
                                const isStagedRemoval = stagedPayeeRemovals.has(payeeIdStr);
                                const isStagedAdd = stagedPayeeAdditions.has(payeeIdStr);
                                return (
                                  <IconButton
                                    size="xl"
                                    iconFontSize="xl"
                                    shape="square"
                                    aria-label={isStagedRemoval ? "Undo" : isStagedAdd ? "Undo" : "Delete"}
                                    title={isStagedRemoval ? "Undo" : isStagedAdd ? "Undo" : "Delete"}
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      handleRemovePayeeFromPayroll(payeeIdStr);
                                    }}
                                    style={{
                                      color: isStagedRemoval
                                        ? "var(--colors-warn)"
                                        : isStagedAdd
                                        ? "var(--colors-success)"
                                        : "var(--colors-error)",
                                    }}
                                  >
                                    <TrashBinIcon size={20} />
                                  </IconButton>
                                );
                              },
                            },
                          ]
                        : []),
                    ]}
                    getExtraCells={(payee) => {
                      const payeeId = payee.payeeId.toString();
                      const row = payrollRunByPayeeId.get(payeeId);
                      return {
                        ...(isAdmin && !isViewOnly ? { removeAction: payeeId } : {}),
                        resolvedCodes: row?.earnings.length ?? 0,
                        previewGross: previewGrossByPayeeId[payeeId] ?? "-",
                        payeeStatus: payeeStatusLabel(row?.payeeStatus ?? payee.status),
                      };
                    }}
                    getRowStyle={(payee) => {
                      const pid = payee.payeeId.toString();
                      if (stagedPayeeRemovals.has(pid)) {
                        return { background: "rgba(220,53,69,0.08)", opacity: 0.75 };
                      }
                      if (stagedPayeeAdditions.has(pid)) {
                        return { background: "rgba(25,135,84,0.08)" };
                      }
                      return {};
                    }}
                    renderExpandedRow={(payee) => {
                      const payeeId = payee.payeeId.toString();
                      const payeeRunData = payrollRunByPayeeId.get(payeeId);
                      const isStagedAdd = stagedPayeeAdditions.has(payeeId);
                      const isStagedPayeeRemoval = stagedPayeeRemovals.has(payeeId);
                      const payeeUpserts = stagedEarningUpserts.get(payeeId) ?? new Map<string, { rate: ethers.BigNumberish; runData: string }>();
                      const payeeRemovals = stagedEarningRemovals.get(payeeId) ?? new Set<string>();
                      const visibleOnChainEarnings = (payeeRunData?.earnings ?? []).filter((earning) => {
                        if (!config?.weeklyScheduleRuleAddress) return true;
                        return earning.rule.toLowerCase() !== config.weeklyScheduleRuleAddress.toLowerCase();
                      });
                      const onChainItems = visibleOnChainEarnings.map((earning) => ({
                        codeId: earning.earningsCodeId.toString(),
                        name: earning.name,
                        rule: earning.rule,
                        rate: earning.rate,
                        config: earning.config,
                        runData: earning.runData,
                        source: earning.source,
                        original: earning,
                      }));

                      return (
                        <EditableEarningsPanel
                          title="Payroll Resolved Earnings"
                          addLabel="+ Add Additional"
                          canEdit={isAdmin && !isViewOnly && currentPayrollId !== null}
                          isStagedAdd={isStagedAdd}
                          isStagedPayeeRemoval={isStagedPayeeRemoval}
                          onChainEarnings={onChainItems}
                          stagedUpserts={payeeUpserts}
                          stagedRemovals={payeeRemovals}
                          earningsCodeById={earningsCodeById}
                          config={config}
                          onAdd={() => openEarningsModal(CurrentPayrollEarningsMode.Additional, payee, null)}
                          onEdit={(item, staged) => {
                            if (item.original) {
                              openEarningsModal(
                                CurrentPayrollEarningsMode.Override,
                                payee,
                                item.original as PayrollResolvedEarningView
                              );
                              return;
                            }
                            openEditStagedAdditional(payee, item.codeId, staged);
                          }}
                          onToggleRemove={(codeId) => handleStageRemoveEarning(payeeId, codeId)}
                        />
                      );
                    }}
                  />
                )}
                {isAdmin && !isViewOnly && currentPayrollId != null && (
                  <Stack gap="xs" style={{ maxWidth: 560 }}>
                    <Row gap="sm" align="center" wrap>
                      <div style={{ flex: 1, minWidth: showResolvedCodesColumn ? 320 : 220 }}>
                        <Select<string>
                          value={selectedManagePayeeId || null}
                          onChange={(v) => setSelectedManagePayeeId(String(v ?? ""))}
                          disabled={addablePayees.length === 0 || isApplyingStaged}
                          compact
                        >
                          {addablePayees.map((payee) => (
                            <SelectOption
                              key={payee.payeeId.toString()}
                              value={payee.payeeId.toString()}
                              label={`#${payee.payeeId.toString()} · ${parsePayeeNameLabel(payee.role)} · ${shortAddress(payee.paymentAddress)}`}
                            />
                          ))}
                        </Select>
                      </div>
                      <ButtonSecondary
                        style={{ flex: 0 }}
                        onClick={handleAddPayeeToPayroll}
                        disabled={!selectedManagePayeeId || isApplyingStaged || addablePayees.length === 0}
                      >
                        + Add Payee
                      </ButtonSecondary>
                    </Row>
                    {addablePayees.length === 0 && (
                      <Text.Body size="sm" color="muted">All organization payees are already in this payroll.</Text.Body>
                    )}
                  </Stack>
                )}
                {isAdmin && !isViewOnly && currentPayrollId != null && stagedActions.length > 0 && (
                  <Row gap="sm" justify="end">
                    <ButtonSecondary
                      style={{ flex: 0 }}
                      onClick={() => clearStaged()}
                      disabled={isApplyingStaged}
                    >
                      Clear
                    </ButtonSecondary>
                    <ButtonPrimary
                      style={{ flex: 0 }}
                      onClick={handleApplyStagedChanges}
                      disabled={isApplyingStaged}
                    >
                      {isApplyingStaged ? "Applying..." : "Apply"}
                    </ButtonPrimary>
                  </Row>
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

        <Modal
          isOpen={earningsModal.isOpen}
          onClose={closeEarningsModal}
          title={
            earningsModal.mode === CurrentPayrollEarningsMode.Override
              ? "Override Earnings"
              : earningsModal.mode === CurrentPayrollEarningsMode.Additional
              ? "Add Additional Earnings"
              : "Earnings"
          }
          width={620}
        >
          <Stack gap="md">
            <Text.Body color="muted" size="sm">
              Payee: #{earningsModal.payee?.payeeId?.toString() ?? "-"} · {shortAddress(earningsModal.payee?.paymentAddress ?? ethers.constants.AddressZero)}
            </Text.Body>

            <Stack>
              <Text.Body size="sm" color="muted">Earnings Code</Text.Body>
              <Select<string>
                value={modalCodeId || null}
                onChange={(v) => setModalCodeId(String(v ?? ""))}
                disabled={earningsModal.mode !== CurrentPayrollEarningsMode.Additional || isViewOnly}
              >
                {(earningsModal.mode === CurrentPayrollEarningsMode.Additional
                  ? additionalModalCodes
                  : earningsModal.earning
                  ? [{
                      earningsCodeId: earningsModal.earning.earningsCodeId,
                      isActive: true,
                      name: earningsModal.earning.name ?? "",
                      rule: earningsModal.earning.rule,
                      config: earningsModal.earning.config,
                    }]
                  : []
                ).map((code) => (
                  <SelectOption
                    key={code.earningsCodeId.toString()}
                    value={code.earningsCodeId.toString()}
                    label={`${formatEarningsCodeIdLabel(code.earningsCodeId)} · ${formatEarningsCodeName(code.name)} · ${buildRuleMeta(code.rule, config).name}`}
                  />
                ))}
              </Select>
            </Stack>

            <Row justify="between" align="center" wrap>
              <Text.Body size="sm" color="muted">
                Rule: {selectedModalRuleMeta.name}
              </Text.Body>
              <Row gap="sm" align="center">
                <Text.Body size="sm" color="muted">{shortAddress(selectedModalRule)}</Text.Body>
                <CopyButton value={selectedModalRule} ariaLabel="Copy rule address" />
              </Row>
            </Row>

            {selectedModalRuleMeta.configRequired && selectedModalCode && (
              <Text.Body size="sm" color="muted">
                Config: {decodeConfigDisplay(selectedModalCode.config, selectedModalCode.rule, config)}
              </Text.Body>
            )}

            <Stack>
              <Text.Body size="sm" color="muted">Rate</Text.Body>
              <Input
                value={modalRate}
                onChange={(e) => setModalRate(e.target.value)}
                placeholder="e.g. 20"
                disabled={isViewOnly}
              />
            </Stack>

            {selectedModalRuleMeta.kind === "hourly" && (
              <Stack>
                <Text.Body size="sm" color="muted">Hours Worked (runData)</Text.Body>
                <NumberInput
                  value={modalHourlyRunData}
                  onChange={(e) => setModalHourlyRunData((e.target as HTMLInputElement).value)}
                  allowDecimal={false}
                  disabled={isViewOnly}
                />
              </Stack>
            )}

            {selectedModalRuleMeta.kind === "custom" && (
              <Stack>
                <Text.Body size="sm" color="muted">Run Data (raw hex)</Text.Body>
                <Input
                  value={modalRawRunData}
                  onChange={(e) => setModalRawRunData(e.target.value)}
                  placeholder="0x"
                  disabled={isViewOnly}
                />
              </Stack>
            )}

            <Row justify="end" gap="sm">
              <ButtonSecondary style={{ flex: 0 }} onClick={closeEarningsModal}>
                Close
              </ButtonSecondary>
              {isAdmin && !isViewOnly && earningsModal.mode !== CurrentPayrollEarningsMode.View && (
                <ButtonPrimary
                  style={{ flex: 0 }}
                  onClick={handleSubmitCurrentPayrollEarning}
                  disabled={earningsModal.mode === CurrentPayrollEarningsMode.Additional && !selectedModalCode}
                >
                  Stage Change
                </ButtonPrimary>
              )}
            </Row>
          </Stack>
        </Modal>
      </Stack>
    </PageContainer>
  );
}
