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
import { PaymentsNavBar } from "../components/Payments/PaymentsNavBar";
import {
  buildRuleMeta,
  decodeConfigDisplay,
  decodeRunDataDisplay,
} from "../utils/payroll/earningsDisplay";

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
  if (status === 1) return "Draft";
  if (status === 2) return "Processed";
  if (status === 3) return "Finalizing";
  if (status === 4) return "Finalized";
  if (status === 5) return "Cancelled";
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
  const [isAddingPayee, setIsAddingPayee] = useState(false);
  const [isRemovingPayee, setIsRemovingPayee] = useState(false);
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

  const selectedModalRule =
    selectedModalCode?.rule ?? earningsModal.earning?.rule ?? ethers.constants.AddressZero;
  const selectedModalRuleMeta = useMemo(
    () => buildRuleMeta(selectedModalRule, config),
    [selectedModalRule, config]
  );

  const isViewOnly = payrollStatus === 4 || payrollStatus === 5;
  const payeeIdsInPayroll = useMemo(
    () => new Set(payrollPayeeRunData.map((row) => row.payeeId.toString())),
    [payrollPayeeRunData]
  );

  const addablePayees = useMemo(
    () => payees.filter((payee) => !payeeIdsInPayroll.has(payee.payeeId.toString())),
    [payees, payeeIdsInPayroll]
  );

  const removablePayees = useMemo(
    () => payees.filter((payee) => payeeIdsInPayroll.has(payee.payeeId.toString())),
    [payees, payeeIdsInPayroll]
  );

  const buildSetEarningsOverrideTx = useCallback(
    (
      _: number,
      orgSlug: string,
      payrollId: number,
      payeeId: string,
      earningsCodeId: string,
      isActive: boolean,
      rateRaw: string,
      runData: string
    ) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address missing");
      }

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: payrollManagerAddress,
        data: payrollInterface.encodeFunctionData("setEarningsOverride", [
          slugBytes,
          payrollId,
          ethers.BigNumber.from(payeeId),
          ethers.BigNumber.from(earningsCodeId),
          isActive,
          ethers.utils.parseEther(rateRaw || "0"),
          runData,
        ]),
      } as any;
    },
    [payrollManagerAddress, payrollInterface]
  );

  const setEarningsOverride = useExecuteRawTx(
    buildSetEarningsOverrideTx,
    (_: number, orgSlug: string, payrollId: number, payeeId: string) =>
      `Updated override for payee ${payeeId} in payroll ${payrollId} (${orgSlug})`
  );

  const buildAddAdditionalEarningTx = useCallback(
    (
      _: number,
      orgSlug: string,
      payrollId: number,
      payeeId: string,
      ruleAddress: string,
      rateRaw: string,
      configBytes: string,
      runData: string
    ) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address missing");
      }

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);

      return {
        to: payrollManagerAddress,
        data: payrollInterface.encodeFunctionData("addEarningsForPayroll", [
          slugBytes,
          payrollId,
          ethers.BigNumber.from(payeeId),
          {
            rule: ruleAddress,
            rate: ethers.utils.parseEther(rateRaw || "0"),
            config: configBytes,
            runData,
          },
        ]),
      } as any;
    },
    [payrollManagerAddress, payrollInterface]
  );

  const addAdditionalEarning = useExecuteRawTx(
    buildAddAdditionalEarningTx,
    (_: number, orgSlug: string, payrollId: number, payeeId: string) =>
      `Added additional earning for payee ${payeeId} in payroll ${payrollId} (${orgSlug})`
  );

  const addConfiguredPayeeToPayroll = useExecuteRawTx(
    (_: number, orgSlug: string, targetPayrollId: number, payeeIdRaw: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: payrollManagerAddress,
        data: payrollInterface.encodeFunctionData("addConfiguredPayeeToPayroll", [
          slugBytes,
          targetPayrollId,
          ethers.BigNumber.from(payeeIdRaw),
        ]),
      } as any;
    },
    (_: number, orgSlug: string, targetPayrollId: number, payeeIdRaw: string) =>
      `Added payee ${payeeIdRaw} to payroll ${targetPayrollId} (${orgSlug})`
  );

  const removePayeeFromPayroll = useExecuteRawTx(
    (_: number, orgSlug: string, targetPayrollId: number, payeeIdRaw: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      return {
        to: payrollManagerAddress,
        data: payrollInterface.encodeFunctionData("removePayeeFromPayroll", [
          slugBytes,
          targetPayrollId,
          ethers.BigNumber.from(payeeIdRaw),
        ]),
      } as any;
    },
    (_: number, orgSlug: string, targetPayrollId: number, payeeIdRaw: string) =>
      `Removed payee ${payeeIdRaw} from payroll ${targetPayrollId} (${orgSlug})`
  );

  useEffect(() => {
    if (!slug) return;
    fetchOrgInfo(slug);
  }, [slug, version, provider, payrollManagerAddress, account, requestedPayrollId]);

  useEffect(() => {
    if (selectedManagePayeeId) return;
    const first = removablePayees[0]?.payeeId?.toString() ?? addablePayees[0]?.payeeId?.toString() ?? "";
    if (first) setSelectedManagePayeeId(first);
  }, [selectedManagePayeeId, removablePayees, addablePayees]);

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

  async function handleProcessPayroll() {
    if (!slug || !isAdmin || isProcessingPayroll || currentPayrollId == null) return;

    setIsProcessingPayroll(true);
    try {
      const chunkLimit = Math.max(1, payees.length * 2);
      await processCurrentPayroll(slug, currentPayrollId, 1, chunkLimit);
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
    if (!chainId || !slug || currentPayrollId == null || !selectedManagePayeeId || isAddingPayee) return;
    setIsAddingPayee(true);
    try {
      await addConfiguredPayeeToPayroll(chainId, slug, currentPayrollId, selectedManagePayeeId);
      setPreviewGrossByPayeeId({});
      setPreviewTotalGross(null);
    } finally {
      setIsAddingPayee(false);
    }
  }

  async function handleRemovePayeeFromPayroll() {
    if (!chainId || !slug || currentPayrollId == null || !selectedManagePayeeId || isRemovingPayee) return;
    setIsRemovingPayee(true);
    try {
      await removePayeeFromPayroll(chainId, slug, currentPayrollId, selectedManagePayeeId);
      setPreviewGrossByPayeeId({});
      setPreviewTotalGross(null);
    } finally {
      setIsRemovingPayee(false);
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
    if (!chainId || !currentPayrollId || !earningsModal.payee || !slug || isViewOnly) return;

    const payeeId = earningsModal.payee.payeeId.toString();
    const runData = resolveModalRunData();

    if (earningsModal.mode === CurrentPayrollEarningsMode.Override) {
      const codeId = earningsModal.earning?.earningsCodeId.toString() ?? modalCodeId;
      if (!codeId) return;

      await setEarningsOverride(
        chainId,
        slug,
        currentPayrollId,
        payeeId,
        codeId,
        true,
        modalRate || "0",
        runData
      );
      setPreviewGrossByPayeeId({});
      setPreviewTotalGross(null);
      closeEarningsModal();
      return;
    }

    if (earningsModal.mode === CurrentPayrollEarningsMode.Additional) {
      if (!selectedModalCode) return;

      await addAdditionalEarning(
        chainId,
        slug,
        currentPayrollId,
        payeeId,
        selectedModalCode.rule,
        modalRate || "0",
        selectedModalCode.config,
        runData
      );
      setPreviewGrossByPayeeId({});
      setPreviewTotalGross(null);
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
              <Row justify="between" align="center" wrap>
                <Text.Title align="left">Payroll Details</Text.Title>
              </Row>
              <PaymentsNavBar slug={slug} active="payrolls" />

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
                  {payrollStatus === 4 && (
                    <Text.Body size="sm" color="muted">
                      Historical payout recipients/amount snapshots placeholder: on-chain historical payout rendering will be added in a follow-up.
                    </Text.Body>
                  )}
                  {isAdmin && !isViewOnly && currentPayrollId != null && (
                    <Stack gap="sm">
                      <Text.Body size="sm" color="muted">Manage Payroll Payees</Text.Body>
                      <Row gap="sm" wrap align="end">
                        <Stack style={{ flex: 1, minWidth: 280 }}>
                          <Text.Body size="sm" color="muted">Payee</Text.Body>
                          <Select<string>
                            value={selectedManagePayeeId || null}
                            onChange={(v) => setSelectedManagePayeeId(String(v))}
                          >
                            {payees.map((payee) => (
                              <SelectOption
                                key={payee.payeeId.toString()}
                                value={payee.payeeId.toString()}
                                label={`#${payee.payeeId.toString()} · ${parsePayeeNameLabel(payee.role)} · ${shortAddress(payee.paymentAddress)}`}
                              />
                            ))}
                          </Select>
                        </Stack>
                        <ButtonSecondary
                          style={{ flex: 0 }}
                          onClick={handleAddPayeeToPayroll}
                          disabled={!selectedManagePayeeId || payeeIdsInPayroll.has(selectedManagePayeeId) || isAddingPayee}
                        >
                          {isAddingPayee ? "Adding..." : "Add Payee"}
                        </ButtonSecondary>
                        <ButtonSecondary
                          style={{ flex: 0 }}
                          onClick={handleRemovePayeeFromPayroll}
                          disabled={!selectedManagePayeeId || !payeeIdsInPayroll.has(selectedManagePayeeId) || isRemovingPayee}
                        >
                          {isRemovingPayee ? "Removing..." : "Remove Payee"}
                        </ButtonSecondary>
                      </Row>
                    </Stack>
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
                      disabled={!isAdmin || !slug || isProcessingPayroll || currentPayrollId == null || isViewOnly}
                    >
                      {isProcessingPayroll ? "Processing..." : "Process Payroll"}
                    </ButtonPrimary>
                  </Row>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {payees.length > 0 && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <PayeesTable
                  payees={payees}
                  searchEnabled={true}
                  extraColumns={[
                    ...(showResolvedCodesColumn
                      ? [
                          {
                            key: "resolvedCodes",
                            header: "Resolved Codes",
                          },
                        ]
                      : []),
                    {
                      key: "payeeStatus",
                      header: "Status",
                    },
                    {
                      key: "previewGross",
                      header: "Preview Gross",
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
                          <Text.Label>Payroll Resolved Earnings</Text.Label>
                          {isAdmin && !isViewOnly && currentPayrollId !== null && (
                            <Row align="center" style={{ width: "100%" }}>
                              <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
                              <ButtonSecondary
                                style={{ flex: 0, minWidth: 170, borderRadius: 999, paddingInline: "var(--spacing-md)" }}
                                onClick={() => openEarningsModal(CurrentPayrollEarningsMode.Additional, payee, null)}
                              >
                                + Add Additional
                              </ButtonSecondary>
                              <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
                            </Row>
                          )}
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
                                {payeeRunData.earnings.map((earning, index) => {
                                  const codeId = earning.earningsCodeId.toString();
                                  const ruleMeta = buildRuleMeta(earning.rule, config);

                                  return (
                                  <Card key={`${payeeId}-${codeId}-${index}`} style={{ border: "1px solid var(--colors-border)" }}>
                                    <CardContent style={{ padding: "var(--spacing-md)", position: "relative" }}>
                                      {isAdmin && !isViewOnly && currentPayrollId !== null && (
                                        <IconButton
                                          size="xl"
                                          iconFontSize="xl"
                                          shape="rounded"
                                          aria-label="Override earning"
                                          title="Override earning"
                                          onClick={() => openEarningsModal(CurrentPayrollEarningsMode.Override, payee, earning)}
                                          style={{
                                            position: "absolute",
                                            right: "var(--spacing-sm)",
                                            top: "var(--spacing-sm)",
                                            zIndex: 1,
                                            borderColor: "var(--colors-borderHover)",
                                            color: "var(--colors-text-main)",
                                          }}
                                        >
                                          <span
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              width: "1em",
                                              height: "1em",
                                              transform: "translate(-2px, 0px) rotate(90deg)",
                                              transformOrigin: "center",
                                              fontSize: "26px",
                                              lineHeight: "1em",
                                              fontWeight: 400,
                                            }}
                                          >
                                            ✎
                                          </span>
                                        </IconButton>
                                      )}
                                      <Stack gap="xs">
                                        <Text.Body weight={600}>
                                          Rule {ruleMeta.name}: {codeId}
                                        </Text.Body>
                                        <Text.Body color={sourceColor(earning.source)} size="sm">
                                          State: {sourceLabel(earning.source)}
                                        </Text.Body>
                                        <Row gap="sm" align="center" wrap>
                                          <Text.Body size="sm" color="muted">
                                            Address: {shortAddress(earning.rule)}
                                          </Text.Body>
                                          <CopyButton value={earning.rule} ariaLabel="Copy rule address" />
                                        </Row>
                                        <Text.Body size="sm" color="muted">
                                          Rate: {formatRate(earning.rate)}
                                        </Text.Body>
                                        {(ruleMeta.configRequired ||
                                          (ruleMeta.kind === "custom" && earning.config !== "0x")) && (
                                          <Text.Body size="sm" color="muted">
                                            Config: {decodeConfigDisplay(earning.config, earning.rule, config)}
                                          </Text.Body>
                                        )}
                                        {(ruleMeta.runDataRequired ||
                                          (ruleMeta.kind === "custom" && earning.runData !== "0x")) && (
                                          <Text.Body size="sm" color="muted">
                                            Run Data: {decodeRunDataDisplay(earning.runData, earning.rule, config)}
                                          </Text.Body>
                                        )}
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                );})}
                              </Stack>
                            );
                          })()}
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                />
            </CardContent>
          </Card>
        )}

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
                onChange={(v) => setModalCodeId(String(v))}
                disabled={earningsModal.mode !== CurrentPayrollEarningsMode.Additional || isViewOnly}
              >
                {(earningsModal.mode === CurrentPayrollEarningsMode.Additional
                  ? activeOrganizationEarningsCodes
                  : earningsModal.earning
                  ? [{
                      earningsCodeId: earningsModal.earning.earningsCodeId,
                      isActive: true,
                      rule: earningsModal.earning.rule,
                      config: earningsModal.earning.config,
                    }]
                  : []
                ).map((code) => (
                  <SelectOption
                    key={code.earningsCodeId.toString()}
                    value={code.earningsCodeId.toString()}
                    label={`#${code.earningsCodeId.toString()} · ${buildRuleMeta(code.rule, config).name}`}
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
                  Save
                </ButtonPrimary>
              )}
            </Row>
          </Stack>
        </Modal>
      </Stack>
    </PageContainer>
  );
}
