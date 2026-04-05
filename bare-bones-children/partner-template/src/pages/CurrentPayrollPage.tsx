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
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { useProcessCurrentPayroll } from "../hooks/payroll/useProcessCurrentPayroll";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import {
  fetchOrganizationEarningsCodes,
  fetchPayrollPayeesWithRunData,
  type OrganizationEarningsCodeView,
  type PayrollResolvedEarningView,
  type PayrollPayeeRunDataView,
} from "../utils/payroll/fetchPayrollViews";
import { shortAddress } from "../utils/formatUtils";
import { PayrollNavigation } from "../components/PayrollNavigation";
import { EarningsDividerButton } from "../components/PayrollEarningsManager/EarningsDividerButton";
import { TrashBinIcon } from "../assets/icons/TrashBinIcon";
import {
  buildRuleMeta,
  decodeConfigDisplay,
  decodeRunDataDisplay,
} from "../utils/payroll/earningsDisplay";
import {
  formatEarningsCodeIdLabel,
  formatEarningsCodeName,
} from "../utils/payroll/earningsCodeDisplay";

function formatRate(rate: ethers.BigNumber) {
  try {
    return ethers.utils.formatEther(rate);
  } catch {
    return "0";
  }
}

enum PayeeStatus {
  Active = 0,
  OnLeave = 1,
  Inactive = 2,
}

enum EarningsSource {
  Default = 0,
  Override = 1,
  Additional = 2,
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

function sourceLabel(source: number) {
  switch (source) {
    case EarningsSource.Override:
      return "Override";
    case EarningsSource.Additional:
      return "Additional";
    default:
      return "Default";
  }
}

function sourceColor(source: number): "main" | "secondary" | "label" | "muted" | "danger" | "warn" | "success" {
  switch (source) {
    case EarningsSource.Override:
      return "warn";
    case EarningsSource.Additional:
      return "success";
    default:
      return "secondary";
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

function templateCodeLabel(templateCode?: string) {
  if (!templateCode || templateCode === ethers.constants.HashZero) {
    return "Manual / Empty";
  }
  try {
    return ethers.utils.parseBytes32String(templateCode);
  } catch {
    return `${templateCode.slice(0, 10)}…${templateCode.slice(-8)}`;
  }
}

function parsePayeeNameLabel(value: string) {
  try {
    return ethers.utils.parseBytes32String(value);
  } catch {
    return value;
  }
}

interface CurrentPayrollEarningsModalState {
  isOpen: boolean;
  mode: CurrentPayrollEarningsMode;
  payee: PayeeModel | null;
  earning: PayrollResolvedEarningView | null;
}

enum PayrollConfigActionKind {
  Upsert = 0,
  Remove = 1,
}

interface PayrollConfigActionPayload {
  action: PayrollConfigActionKind;
  payeeId: ethers.BigNumberish;
  earningsCodeIds: ethers.BigNumberish[];
  rates: ethers.BigNumberish[];
  runData: string[];
}

interface StagedPayrollAction {
  id: string;
  label: string;
  payload: PayrollConfigActionPayload;
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
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [payrollStatus, setPayrollStatus] = useState<number | null>(null);
  const [payrollTemplateCode, setPayrollTemplateCode] = useState<string>(ethers.constants.HashZero);
  const [payrollStartTime, setPayrollStartTime] = useState<number | null>(null);
  const [payrollEndTime, setPayrollEndTime] = useState<number | null>(null);
  const [selectedManagePayeeId, setSelectedManagePayeeId] = useState<string>("");
  const [isApplyingStaged, setIsApplyingStaged] = useState(false);
  const [stagedActions, setStagedActions] = useState<StagedPayrollAction[]>([]);
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
    () => organizationEarningsCodes.filter((row) => Boolean(row.isActive)),
    [organizationEarningsCodes]
  );

  const selectedModalCode = useMemo(
    () => (modalCodeId ? earningsCodeById.get(modalCodeId) ?? null : null),
    [modalCodeId, earningsCodeById]
  );
  const hasStagedChanges = stagedActions.length > 0;

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

  const stagedPayeeRemovals = useMemo(() => {
    const set = new Set<string>();
    for (const action of stagedActions) {
      if (action.payload.action === PayrollConfigActionKind.Remove && action.payload.earningsCodeIds.length === 0) {
        set.add(action.payload.payeeId.toString());
      }
    }
    return set;
  }, [stagedActions]);

  const stagedPayeeAdditions = useMemo(() => {
    const set = new Set<string>();
    for (const action of stagedActions) {
      if (action.payload.action === PayrollConfigActionKind.Upsert && action.payload.earningsCodeIds.length === 0) {
        set.add(action.payload.payeeId.toString());
      }
    }
    return set;
  }, [stagedActions]);

  const stagedEarningRemovals = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const action of stagedActions) {
      if (action.payload.action === PayrollConfigActionKind.Remove && action.payload.earningsCodeIds.length > 0) {
        const pid = action.payload.payeeId.toString();
        if (!map.has(pid)) map.set(pid, new Set());
        for (const codeId of action.payload.earningsCodeIds) {
          map.get(pid)!.add(codeId.toString());
        }
      }
    }
    return map;
  }, [stagedActions]);

  const stagedEarningUpserts = useMemo(() => {
    const map = new Map<string, Map<string, { rate: ethers.BigNumberish; runData: string }>>();
    for (const action of stagedActions) {
      if (action.payload.action === PayrollConfigActionKind.Upsert && action.payload.earningsCodeIds.length > 0) {
        const pid = action.payload.payeeId.toString();
        if (!map.has(pid)) map.set(pid, new Map());
        for (let i = 0; i < action.payload.earningsCodeIds.length; i++) {
          const codeId = action.payload.earningsCodeIds[i].toString();
          map.get(pid)!.set(codeId, {
            rate: action.payload.rates[i] ?? ethers.BigNumber.from(0),
            runData: action.payload.runData[i] ?? "0x",
          });
        }
      }
    }
    return map;
  }, [stagedActions]);

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

  const processFlowSteps = useMemo(() => {
    const status = payrollStatus ?? PayrollStatus.None;
    return [
      {
        key: "draft",
        label: "Payroll is in Draft state",
        done: status >= PayrollStatus.Draft,
        active: status < PayrollStatus.Draft,
      },
      {
        key: "process",
        label: "Process payroll chunks",
        done: status >= PayrollStatus.Processed,
        active: status === PayrollStatus.Draft || status === PayrollStatus.Processing,
      },
      {
        key: "finalize",
        label: "Finalize payroll chunks",
        done: status >= PayrollStatus.Finalized,
        active: status === PayrollStatus.Processed || status === PayrollStatus.Finalizing,
      },
      {
        key: "complete",
        label: "Payroll finalized",
        done: status >= PayrollStatus.Finalized,
        active: false,
      },
    ];
  }, [payrollStatus]);

  const stagePayrollAction = useCallback((label: string, payload: PayrollConfigActionPayload) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setStagedActions((prev) => [...prev, { id, label, payload }]);
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
              undefined,
              account ?? undefined
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
            setPayrollStatus(Number(run?.status ?? run?.[0] ?? 0));
            setPayrollTemplateCode(String(run?.templateCode ?? run?.[1] ?? ethers.constants.HashZero));
            setPayrollStartTime(Number((run?.startTime ?? run?.[2] ?? 0).toString()));
            setPayrollEndTime(Number((run?.endTime ?? run?.[3] ?? 0).toString()));

            const runDataRows = await fetchPayrollPayeesWithRunData(
              provider,
              payrollManagerAddress,
              orgSlug,
              targetPayrollId,
              undefined,
              account ?? undefined
            );
            setPayrollPayeeRunData(runDataRows);
          } else {
            setPayrollPayeeRunData([]);
            setPayrollStatus(null);
            setPayrollTemplateCode(ethers.constants.HashZero);
            setPayrollStartTime(null);
            setPayrollEndTime(null);
          }
        } else {
          setCurrentPayrollId(null);
          setPayrollPayeeRunData([]);
          setOrganizationEarningsCodes([]);
          setPayrollStatus(null);
          setPayrollTemplateCode(ethers.constants.HashZero);
          setPayrollStartTime(null);
          setPayrollEndTime(null);
        }
      } else {
        setPayees([]);
        setCurrentPayrollId(null);
        setPayrollPayeeRunData([]);
        setOrganizationEarningsCodes([]);
        setPayrollStatus(null);
        setPayrollTemplateCode(ethers.constants.HashZero);
        setPayrollStartTime(null);
        setPayrollEndTime(null);
      }
    } catch (err) {
      console.error("Error fetching org info:", err);
      setOrgInfo(null);
      setPayees([]);
      setCurrentPayrollId(null);
      setPayrollPayeeRunData([]);
      setOrganizationEarningsCodes([]);
      setPayrollStatus(null);
      setPayrollTemplateCode(ethers.constants.HashZero);
      setPayrollStartTime(null);
      setPayrollEndTime(null);
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
              callOverrides
            )
          : await manager.previewPayrollChunk(
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

  async function handleAddPayeeToPayroll() {
    if (!slug || currentPayrollId == null || !selectedManagePayeeId) return;

    stagePayrollAction(`Add payee #${selectedManagePayeeId} to payroll roster`, {
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

    stagePayrollAction(`Remove payee #${payeeIdRaw} from payroll roster`, {
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

    stagePayrollAction(
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
    if (!chainId || !slug || currentPayrollId == null || stagedActions.length === 0 || isApplyingStaged) return;

    setIsApplyingStaged(true);
    try {
      await configurePayroll(
        chainId,
        slug,
        currentPayrollId,
        stagedActions.map((row) => row.payload)
      );
      setStagedActions([]);
      setPreviewGrossByPayeeId({});
      setPreviewTotalGross(null);
    } finally {
      setIsApplyingStaged(false);
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
                    Template: {templateCodeLabel(payrollTemplateCode)}
                  </Text.Body>
                  <Text.Body color="muted" size="sm">
                    Window: {payrollStartTime ? new Date(payrollStartTime * 1000).toLocaleDateString() : "-"} → {payrollEndTime ? new Date(payrollEndTime * 1000).toLocaleDateString() : "-"}
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
                  {payrollStatus === PayrollStatus.Finalized && (
                    <Text.Body size="sm" color="muted">
                      Historical payout recipients/amount snapshots placeholder: on-chain historical payout rendering will be added in a follow-up.
                    </Text.Body>
                  )}
                  <Row gap="sm" justify="end">
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
                {payrollPayees.length > 0 ? (
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
                      const onChainCodeIds = new Set((payeeRunData?.earnings ?? []).map((e) => e.earningsCodeId.toString()));
                      const newStagedEarnings = Array.from(payeeUpserts.entries()).filter(([codeId]) => !onChainCodeIds.has(codeId));

                      return (
                        <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
                          <CardContent>
                            <Stack gap="sm">
                              <Text.Label>Payroll Resolved Earnings</Text.Label>
                              {isStagedAdd && (
                                <Text.Body size="sm" color="success">+ Staged: this payee will be added to the payroll</Text.Body>
                              )}
                              {isStagedPayeeRemoval && (
                                <Text.Body size="sm" color="danger">- Staged: this payee and all payroll earnings will be removed</Text.Body>
                              )}
                              {isAdmin && !isViewOnly && currentPayrollId !== null && !isStagedPayeeRemoval && (
                                <EarningsDividerButton
                                  label="+ Add Additional"
                                  onClick={() => openEarningsModal(CurrentPayrollEarningsMode.Additional, payee, null)}
                                  minWidth={170}
                                />
                              )}
                              {currentPayrollId === null ? (
                                <Text.Body color="muted">No payroll has been created yet.</Text.Body>
                              ) : !payeeRunData && !isStagedAdd ? (
                                <Text.Body color="muted">This payee is not included in payroll #{currentPayrollId}.</Text.Body>
                              ) : (payeeRunData?.earnings.length ?? 0) === 0 && newStagedEarnings.length === 0 ? (
                                <Text.Body color="muted">No earnings assigned.</Text.Body>
                              ) : (
                                <Stack gap="sm">
                                  {(payeeRunData?.earnings ?? []).map((earning, index) => {
                                    const codeId = earning.earningsCodeId.toString();
                                    const codeLabel = formatEarningsCodeIdLabel(earning.earningsCodeId);
                                    const ruleMeta = buildRuleMeta(earning.rule, config);
                                    const isStagedRemoval = isStagedPayeeRemoval || payeeRemovals.has(codeId);
                                    const isStagedOverride = payeeUpserts.has(codeId);
                                    const overrideData = payeeUpserts.get(codeId);

                                    return (
                                      <Card
                                        key={`${payeeId}-${codeId}-${index}`}
                                        style={{
                                          border: `1px solid ${
                                            isStagedRemoval
                                              ? "var(--colors-error, #dc3545)"
                                              : isStagedOverride
                                              ? "var(--colors-warn, #fd7e14)"
                                              : "var(--colors-border)"
                                          }`,
                                          opacity: isStagedRemoval ? 0.65 : 1,
                                        }}
                                      >
                                        <CardContent style={{ padding: "var(--spacing-md)", position: "relative" }}>
                                          {isAdmin && !isViewOnly && currentPayrollId !== null && (
                                            <Row
                                              gap="xs"
                                              style={{
                                                position: "absolute",
                                                right: "var(--spacing-sm)",
                                                top: "var(--spacing-sm)",
                                                zIndex: 1,
                                              }}
                                            >
                                              {!isStagedRemoval && (
                                                <IconButton
                                                  size="xl"
                                                  iconFontSize="xl"
                                                  shape="rounded"
                                                  aria-label="Override earning"
                                                  title="Override earning"
                                                  onClick={() => openEarningsModal(CurrentPayrollEarningsMode.Override, payee, earning)}
                                                  style={{ borderColor: "var(--colors-borderHover)", color: "var(--colors-text-main)" }}
                                                >
                                                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "1em", height: "1em", transform: "translate(-2px,0) rotate(90deg)", fontSize: "26px", lineHeight: "1em", fontWeight: 400 }}>✎</span>
                                                </IconButton>
                                              )}
                                              <IconButton
                                                size="xl"
                                                iconFontSize="xl"
                                                shape="square"
                                                aria-label={isStagedRemoval ? "Unstage removal" : "Stage removal"}
                                                title={isStagedRemoval ? "Unstage removal" : "Stage removal"}
                                                onClick={() => handleStageRemoveEarning(payeeId, codeId)}
                                                style={{ color: isStagedRemoval ? "var(--colors-warn)" : "var(--colors-error)", borderColor: "var(--colors-borderHover)" }}
                                              >
                                                <TrashBinIcon size={20} />
                                              </IconButton>
                                            </Row>
                                          )}
                                          <Stack gap="xs">
                                            <Text.Body weight={600} style={{ textDecoration: isStagedRemoval ? "line-through" : undefined }}>
                                              {isStagedRemoval ? "⛔ " : isStagedOverride ? "✎ " : ""}{ruleMeta.name}: {codeLabel}
                                            </Text.Body>
                                            {earning.name && (
                                              <Text.Body size="sm" color="muted">Name: {formatEarningsCodeName(earning.name)}</Text.Body>
                                            )}
                                            <Text.Body color={sourceColor(earning.source)} size="sm">State: {sourceLabel(earning.source)}</Text.Body>
                                            <Row gap="sm" align="center" wrap>
                                              <Text.Body size="sm" color="muted">Address: {shortAddress(earning.rule)}</Text.Body>
                                              <CopyButton value={earning.rule} ariaLabel="Copy rule address" />
                                            </Row>
                                            <Text.Body size="sm" color="muted">
                                              Rate: {overrideData
                                                ? `${ethers.utils.formatEther(overrideData.rate as ethers.BigNumberish)} (staged)`
                                                : formatRate(earning.rate)}
                                            </Text.Body>
                                            {(ruleMeta.configRequired || (ruleMeta.kind === "custom" && earning.config !== "0x")) && (
                                              <Text.Body size="sm" color="muted">Config: {decodeConfigDisplay(earning.config, earning.rule, config)}</Text.Body>
                                            )}
                                            {(ruleMeta.runDataRequired || (ruleMeta.kind === "custom" && earning.runData !== "0x")) && (
                                              <Text.Body size="sm" color="muted">
                                                Run Data: {decodeRunDataDisplay(overrideData ? (overrideData.runData as string) : earning.runData, earning.rule, config)}
                                              </Text.Body>
                                            )}
                                          </Stack>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                  {newStagedEarnings.map(([codeId, upsert]) => {
                                    const code = earningsCodeById.get(codeId);
                                    const ruleMeta = buildRuleMeta(code?.rule ?? ethers.constants.AddressZero, config);
                                    const cardBorder = isStagedPayeeRemoval
                                      ? "var(--colors-error, #dc3545)"
                                      : "var(--colors-success, #198754)";
                                    return (
                                      <Card key={`staged-new-${payeeId}-${codeId}`} style={{ border: `1px solid ${cardBorder}`, opacity: isStagedPayeeRemoval ? 0.65 : 1 }}>
                                        <CardContent style={{ padding: "var(--spacing-md)", position: "relative" }}>
                                          {isAdmin && !isViewOnly && !isStagedPayeeRemoval && (
                                            <IconButton
                                              size="xl"
                                              iconFontSize="xl"
                                              shape="square"
                                              aria-label="Remove staged earning"
                                              title="Remove staged earning"
                                              onClick={() => handleStageRemoveEarning(payeeId, codeId)}
                                              style={{ position: "absolute", right: "var(--spacing-sm)", top: "var(--spacing-sm)", color: "var(--colors-error)", borderColor: "var(--colors-borderHover)" }}
                                            >
                                              <TrashBinIcon size={20} />
                                            </IconButton>
                                          )}
                                          <Stack gap="xs">
                                            <Text.Body weight={600} color={isStagedPayeeRemoval ? "danger" : "success"} style={{ textDecoration: isStagedPayeeRemoval ? "line-through" : undefined }}>
                                              {isStagedPayeeRemoval ? "⛔ " : "✚ "}{ruleMeta.name}: {formatEarningsCodeIdLabel(codeId)}
                                            </Text.Body>
                                            {code?.name && <Text.Body size="sm" color="muted">Name: {formatEarningsCodeName(code.name)}</Text.Body>}
                                            <Text.Body size="sm" color="muted">Rate: {ethers.utils.formatEther(upsert.rate as ethers.BigNumberish)}</Text.Body>
                                            {ruleMeta.runDataRequired && (
                                              <Text.Body size="sm" color="muted">Run Data: {decodeRunDataDisplay(upsert.runData as string, code?.rule ?? ethers.constants.AddressZero, config)}</Text.Body>
                                            )}
                                            {!isStagedPayeeRemoval && isAdmin && !isViewOnly && (
                                              <Row gap="xs" justify="end">
                                                <IconButton
                                                  size="xl"
                                                  iconFontSize="xl"
                                                  shape="rounded"
                                                  aria-label="Edit staged earning"
                                                  title="Edit staged earning"
                                                  onClick={() => openEditStagedAdditional(payee, codeId, upsert)}
                                                  style={{ borderColor: "var(--colors-borderHover)", color: "var(--colors-text-main)" }}
                                                >
                                                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "1em", height: "1em", transform: "translate(-2px,0) rotate(90deg)", fontSize: "26px", lineHeight: "1em", fontWeight: 400 }}>✎</span>
                                                </IconButton>
                                              </Row>
                                            )}
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
                  />
                ) : (
                  <Text.Body color="muted">No payees are currently included in this payroll.</Text.Body>
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
                      onClick={() => setStagedActions([])}
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

        <Modal
          isOpen={isProcessFlowOpen}
          onClose={() => {
            if (isProcessingPayroll) return;
            setIsProcessFlowOpen(false);
          }}
          title="Process Payroll Flow"
          width={560}
        >
          <Stack gap="md">
            <Text.Body size="sm" color="muted">
              Payroll #{currentPayrollId ?? "-"} · {payrollStatusLabel(payrollStatus ?? 0)}
            </Text.Body>

            <Stack gap="xs">
              {processFlowSteps.map((step) => (
                <Row key={step.key} gap="sm" align="center">
                  <Text.Body
                    style={{ width: 20, display: "inline-flex", justifyContent: "center" }}
                    color={step.done ? "success" : step.active ? "warn" : "muted"}
                  >
                    {step.done ? "✓" : step.active ? "•" : "○"}
                  </Text.Body>
                  <Text.Body color={step.done ? "main" : step.active ? "warn" : "muted"}>
                    {step.label}
                  </Text.Body>
                </Row>
              ))}
            </Stack>

            {processFlowError && (
              <Text.Body size="sm" color="danger">
                {processFlowError}
              </Text.Body>
            )}

            {payrollStatus === PayrollStatus.Finalized ? (
              <Text.Body size="sm" color="success">Payroll is already finalized.</Text.Body>
            ) : payrollStatus === PayrollStatus.Cancelled ? (
              <Text.Body size="sm" color="warn">Payroll is cancelled and cannot continue.</Text.Body>
            ) : (
              <Text.Body size="sm" color="muted">
                If processing fails, click Continue again to resume from the last completed step.
              </Text.Body>
            )}

            <Row justify="end" gap="sm">
              <ButtonSecondary
                style={{ flex: 0 }}
                onClick={() => setIsProcessFlowOpen(false)}
                disabled={isProcessingPayroll}
              >
                Close
              </ButtonSecondary>
              <ButtonPrimary
                style={{ flex: 0 }}
                onClick={handleProcessPayroll}
                disabled={isProcessingPayroll || payrollStatus === PayrollStatus.Finalized || payrollStatus === PayrollStatus.Cancelled}
              >
                {isProcessingPayroll ? "Working..." : processFlowError ? "Continue" : "Continue"}
              </ButtonPrimary>
            </Row>
          </Stack>
        </Modal>

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
