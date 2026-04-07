import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { Modal } from "../components/Modal/Modal";
import { IconButton } from "../components/Button/IconButton";

import { Select, SelectOption } from "../components/Select";
import { NumberInput } from "../components/Inputs/NumberInput";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { PayeesTable } from "../components/PayeesTable";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import {
  fetchOrganizationEarningsCodes,
  type OrganizationEarningsCodeView,
  type PayeeDefaultsView,
} from "../utils/payroll/fetchPayrollViews";
import {
  formatEarningsCodeIdLabel,
  formatEarningsCodeName,
} from "../utils/payroll/earningsCodeDisplay";
import { TrashBinIcon } from "../assets/icons/TrashBinIcon";
import { fetchPayBatchCodes, fetchPayBatchPayeesWithDefaults } from "../utils/payroll/fetchPayBatchViews";
import { buildRuleMeta, decodeRunDataDisplay } from "../utils/payroll/earningsDisplay";
import { PayrollNavigation } from "../components/PayrollNavigation";
import { EarningsDividerButton } from "../components/PayrollEarningsManager/EarningsDividerButton";
import {
  usePayrollStagingManager,
  PayrollConfigActionKind,
  type PayrollConfigActionPayload,
} from "../components/PayrollStagingManager";



function parsePayeeNameLabel(value: string) {
  try {
    return ethers.utils.parseBytes32String(value);
  } catch {
    return value;
  }
}

function parseBytes32Label(value: string) {
  try {
    return ethers.utils.parseBytes32String(value);
  } catch {
    return `${value.slice(0, 10)}…${value.slice(-8)}`;
  }
}

function formatBatchCodeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Pay batch code is required");
  if (trimmed.startsWith("0x")) {
    if (trimmed.length !== 66) {
      throw new Error("Hex batch code must be a bytes32 value");
    }
    return trimmed;
  }
  return ethers.utils.formatBytes32String(trimmed);
}

interface BatchEarningModalState {
  isOpen: boolean;
  payee: PayeeModel | null;
  lockedCodeId: string | null;
}

export function PayBatchesPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [loading, setLoading] = useState(false);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);
  const [selectedBatchCode, setSelectedBatchCode] = useState<string | null>(null);
  const [newBatchCode, setNewBatchCode] = useState("");

  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [earningsCodes, setEarningsCodes] = useState<OrganizationEarningsCodeView[]>([]);
  const [batchRows, setBatchRows] = useState<PayeeDefaultsView[]>([]);

  const [selectedPayeeId, setSelectedPayeeId] = useState("");
  const [earningModal, setEarningModal] = useState<BatchEarningModalState>({
    isOpen: false,
    payee: null,
    lockedCodeId: null,
  });
  const [modalCodeId, setModalCodeId] = useState("");
  const [modalRate, setModalRate] = useState("0");
  const [modalHourlyRunData, setModalHourlyRunData] = useState("40");
  const [modalRawRunData, setModalRawRunData] = useState("0x");

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  const earningsCodeById = useMemo(
    () => new Map(earningsCodes.map((code) => [code.earningsCodeId.toString(), code] as const)),
    [earningsCodes]
  );

  const activeEarningsCodes = useMemo(
    () =>
      earningsCodes.filter((code) => {
        if (!code.isActive) return false;
        if (!config?.weeklyScheduleRuleAddress) return true;
        return code.rule.toLowerCase() !== config.weeklyScheduleRuleAddress.toLowerCase();
      }),
    [earningsCodes, config]
  );

  const batchPayeeIds = useMemo(
    () => new Set(batchRows.map((row) => row.payeeId.toString())),
    [batchRows]
  );

  const batchRowByPayeeId = useMemo(
    () => new Map(batchRows.map((row) => [row.payeeId.toString(), row] as const)),
    [batchRows]
  );

  const payeeById = useMemo(
    () => new Map(payees.map((p) => [p.payeeId.toString(), p] as const)),
    [payees]
  );

  function normalizeConfigureActions(actions: PayrollConfigActionPayload[]): PayrollConfigActionPayload[] {
    const byPayee = new Map<
      string,
      {
        payeeId: ethers.BigNumberish;
        removeAll: boolean;
        includeEmptyUpsert: boolean;
        upserts: Map<string, { rate: ethers.BigNumberish; runData: string }>;
        removeCodes: Set<string>;
      }
    >();

    for (const action of actions) {
      const payeeId = action.payeeId.toString();
      if (!byPayee.has(payeeId)) {
        byPayee.set(payeeId, {
          payeeId: action.payeeId,
          removeAll: false,
          includeEmptyUpsert: false,
          upserts: new Map(),
          removeCodes: new Set(),
        });
      }

      const state = byPayee.get(payeeId)!;

      if (action.action === PayrollConfigActionKind.Remove) {
        if (action.earningsCodeIds.length === 0) {
          state.removeAll = true;
          state.includeEmptyUpsert = false;
          state.upserts.clear();
          state.removeCodes.clear();
          continue;
        }

        if (state.removeAll) continue;

        for (const codeIdRaw of action.earningsCodeIds) {
          const codeId = codeIdRaw.toString();
          state.upserts.delete(codeId);
          state.removeCodes.add(codeId);
        }
        continue;
      }

      if (state.removeAll) continue;

      if (action.earningsCodeIds.length === 0) {
        state.includeEmptyUpsert = true;
        continue;
      }

      for (let i = 0; i < action.earningsCodeIds.length; i++) {
        const codeId = action.earningsCodeIds[i].toString();
        state.removeCodes.delete(codeId);
        state.upserts.set(codeId, {
          rate: action.rates[i] ?? ethers.BigNumber.from(0),
          runData: action.runData[i] ?? "0x",
        });
      }
    }

    const normalized: PayrollConfigActionPayload[] = [];
    for (const state of byPayee.values()) {
      if (state.removeAll) {
        normalized.push({
          action: PayrollConfigActionKind.Remove,
          payeeId: state.payeeId,
          earningsCodeIds: [],
          rates: [],
          runData: [],
        });
        continue;
      }

      if (state.upserts.size > 0) {
        const entries = Array.from(state.upserts.entries());
        normalized.push({
          action: PayrollConfigActionKind.Upsert,
          payeeId: state.payeeId,
          earningsCodeIds: entries.map(([codeId]) => ethers.BigNumber.from(codeId)),
          rates: entries.map(([, value]) => value.rate),
          runData: entries.map(([, value]) => value.runData),
        });
      } else if (state.includeEmptyUpsert) {
        normalized.push({
          action: PayrollConfigActionKind.Upsert,
          payeeId: state.payeeId,
          earningsCodeIds: [],
          rates: [],
          runData: [],
        });
      }

      if (state.removeCodes.size > 0) {
        normalized.push({
          action: PayrollConfigActionKind.Remove,
          payeeId: state.payeeId,
          earningsCodeIds: Array.from(state.removeCodes).map((codeId) => ethers.BigNumber.from(codeId)),
          rates: [],
          runData: [],
        });
      }
    }

    return normalized;
  }

  function formatRate(rate: ethers.BigNumber) {
    try {
      return ethers.utils.formatEther(rate);
    } catch {
      return "0";
    }
  }

  const selectedModalCode = useMemo(
    () => (modalCodeId ? earningsCodeById.get(modalCodeId) ?? null : null),
    [modalCodeId, earningsCodeById]
  );

  const selectedModalRule = selectedModalCode?.rule ?? ethers.constants.AddressZero;
  const selectedModalRuleMeta = useMemo(
    () => buildRuleMeta(selectedModalRule, config),
    [selectedModalRule, config]
  );

  const availableModalCodes = useMemo(() => {
    if (!earningModal.payee) return [] as OrganizationEarningsCodeView[];

    const payeeId = earningModal.payee.payeeId.toString();
    if (earningModal.lockedCodeId) {
      const selected = activeEarningsCodes.find((c) => c.earningsCodeId.toString() === earningModal.lockedCodeId);
      return selected ? [selected] : [];
    }

    const taken = new Set<string>();
    for (const earning of batchRowByPayeeId.get(payeeId)?.earnings ?? []) {
      taken.add(earning.earningsCodeId.toString());
    }
    const filtered = activeEarningsCodes.filter((c) => !taken.has(c.earningsCodeId.toString()));
    if (modalCodeId) {
      const selected = activeEarningsCodes.find((c) => c.earningsCodeId.toString() === modalCodeId);
      if (selected && !filtered.some((c) => c.earningsCodeId.eq(selected.earningsCodeId))) {
        return [selected, ...filtered];
      }
    }
    return filtered;
  }, [earningModal, activeEarningsCodes, batchRowByPayeeId, modalCodeId]);

  function resolveModalRunData() {
    if (selectedModalRuleMeta.kind === "hourly") {
      return ethers.utils.defaultAbiCoder.encode(["uint32"], [Math.max(0, Math.floor(Number(modalHourlyRunData) || 0))]);
    }
    if (selectedModalRuleMeta.kind === "custom") {
      return modalRawRunData?.trim() || "0x";
    }
    return "0x";
  }

  function openAddEarningModal(payeeId: string) {
    const payee = payeeById.get(payeeId) ?? null;
    if (!payee) return;

    const taken = new Set<string>();
    for (const earning of batchRowByPayeeId.get(payeeId)?.earnings ?? []) {
      taken.add(earning.earningsCodeId.toString());
    }
    const firstAvailable = activeEarningsCodes.find((c) => !taken.has(c.earningsCodeId.toString()));
    setEarningModal({ isOpen: true, payee, lockedCodeId: null });
    setModalCodeId(firstAvailable?.earningsCodeId.toString() ?? "");
    setModalRate("0");
    setModalRawRunData("0x");
    setModalHourlyRunData("40");
  }

  function openEditEarningModal(payeeId: string, codeId: string, rate: ethers.BigNumberish, runData: string) {
    const payee = payeeById.get(payeeId) ?? null;
    if (!payee) return;

    setEarningModal({ isOpen: true, payee, lockedCodeId: codeId });
    setModalCodeId(codeId);
    try {
      setModalRate(ethers.utils.formatEther(rate));
    } catch {
      setModalRate("0");
    }
    setModalRawRunData(runData || "0x");

    try {
      const code = earningsCodeById.get(codeId);
      const meta = buildRuleMeta(code?.rule ?? ethers.constants.AddressZero, config);
      if (meta.kind === "hourly" && runData && runData !== "0x") {
        const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], runData);
        setModalHourlyRunData(String(Number((decoded?.[0] as ethers.BigNumber).toString())));
      } else {
        setModalHourlyRunData("40");
      }
    } catch {
      setModalHourlyRunData("40");
    }
  }

  function closeEarningModal() {
    setEarningModal({ isOpen: false, payee: null, lockedCodeId: null });
  }

  function stageEarningFromModal() {
    if (!earningModal.payee || !modalCodeId) return;

    const payeeId = earningModal.payee.payeeId.toString();
    if (stagedPayeeRemovals.has(payeeId)) return;

    const runData = resolveModalRunData();
    setStagedActions((prev) => {
      const filtered = prev.filter(
        (a) =>
          !(
            a.payload.payeeId.toString() === payeeId &&
            a.payload.earningsCodeIds.some((id) => id.toString() === modalCodeId)
          )
      );

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return [
        ...filtered,
        {
          id,
          label: `Upsert earning code ${formatEarningsCodeIdLabel(modalCodeId)} for payee #${payeeId}`,
          payload: {
            action: PayrollConfigActionKind.Upsert,
            payeeId: ethers.BigNumber.from(payeeId),
            earningsCodeIds: [ethers.BigNumber.from(modalCodeId)],
            rates: [ethers.utils.parseEther(modalRate || "0")],
            runData: [runData],
          },
        },
      ];
    });

    closeEarningModal();
  }

  async function refreshData(orgSlug: string, nextBatchCode?: string | null) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const org = await contract.organizations(slugBytes);

      setOrgInfo({ owner: org.owner, exists: org.exists });
      setIsAdmin(Boolean(org.exists && org.owner.toLowerCase() === account?.toLowerCase()));

      if (!org.exists) {
        setPayees([]);
        setEarningsCodes([]);
        setBatchCodes([]);
        setBatchRows([]);
        setSelectedBatchCode(null);
        return;
      }

      const [payeeList, earningsCatalog, codes] = await Promise.all([
        fetchPayeesByOrganization(provider, payrollManagerAddress, slugBytes),
        fetchOrganizationEarningsCodes(provider, payrollManagerAddress, orgSlug),
        fetchPayBatchCodes(provider, payrollManagerAddress, orgSlug, account ?? undefined),
      ]);

      setPayees(payeeList);
      setEarningsCodes(earningsCatalog);
      setBatchCodes(codes);

      const targetCode = nextBatchCode ?? selectedBatchCode ?? codes[0] ?? null;
      setSelectedBatchCode(targetCode);

      if (targetCode) {
        const rows = await fetchPayBatchPayeesWithDefaults(
          provider,
          payrollManagerAddress,
          orgSlug,
          targetCode,
          undefined,
          account ?? undefined
        );
        setBatchRows(rows);
      } else {
        setBatchRows([]);
      }
    } catch (error) {
      console.error("Failed to load pay batch data", error);
      setOrgInfo(null);
      setPayees([]);
      setEarningsCodes([]);
      setBatchCodes([]);
      setBatchRows([]);
      setSelectedBatchCode(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    refreshData(slug);
  }, [slug, provider, payrollManagerAddress, account, version]);

  useEffect(() => {
    if (!selectedBatchCode || !slug) return;
    if (!provider || !payrollManagerAddress) return;

    fetchPayBatchPayeesWithDefaults(
      provider,
      payrollManagerAddress,
      slug,
      selectedBatchCode,
      undefined,
      account ?? undefined
    )
      .then(setBatchRows)
      .catch((error) => {
        console.error("Failed loading selected pay batch", error);
        setBatchRows([]);
      });
  }, [selectedBatchCode]);

  const createPayBatch = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCodeRaw: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const payBatchCode = formatBatchCodeInput(payBatchCodeRaw);

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("createPayBatch", [slugBytes, payBatchCode]),
      } as any;
    },
    (_: number, __: string, payBatchCodeRaw: string) => `Created pay batch ${payBatchCodeRaw}`
  );

  const configurePayBatch = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCode: string, actions: PayrollConfigActionPayload[]) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      if (!actions || !Array.isArray(actions) || actions.length === 0) {
        throw new Error("No actions to apply");
      }
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const normalizedActions = normalizeConfigureActions(actions);

      const txActions = normalizedActions.map((action) => {
        const earningsCodeIds = action.earningsCodeIds.map((id) => ethers.BigNumber.from(id));
        const assignments =
          action.action === PayrollConfigActionKind.Upsert
            ? earningsCodeIds.map((earningsCodeId, idx) => ({
                earningsCodeId,
                rate: ethers.BigNumber.from(action.rates[idx] ?? 0),
                runData: action.runData[idx] ?? "0x",
              }))
            : [];

        return {
          action: action.action,
          payeeId: ethers.BigNumber.from(action.payeeId),
          assignments,
          earningsCodeIds,
        };
      });

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("configurePayBatch(bytes32,bytes32,(uint8,uint256,(uint256,uint256,bytes)[],uint256[])[])", [slugBytes, payBatchCode, txActions]),
      } as any;
    },
    (_: number, __: string, payBatchCode: string, actions: PayrollConfigActionPayload[]) =>
      `Configured ${actions.length} staged action(s) for ${parseBytes32Label(payBatchCode)}`
  );

  const stagingManager = usePayrollStagingManager(async (actions) => {
    if (!chainId || !slug || !selectedBatchCode) return false;
    const tx = await configurePayBatch(chainId, slug, selectedBatchCode, actions);
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

  const stagedAddedPayeeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const action of stagedActions) {
      const payeeId = action.payload.payeeId.toString();
      if (action.payload.action === PayrollConfigActionKind.Upsert) {
        ids.add(payeeId);
      }
      if (action.payload.action === PayrollConfigActionKind.Remove && action.payload.earningsCodeIds.length === 0) {
        ids.delete(payeeId);
      }
    }
    return ids;
  }, [stagedActions]);

  const effectiveBatchPayees = useMemo(() => {
    const ids = new Set<string>(batchPayeeIds);
    for (const id of stagedAddedPayeeIds.values()) {
      ids.add(id);
    }
    return payees.filter((payee) => ids.has(payee.payeeId.toString()));
  }, [payees, batchPayeeIds, stagedAddedPayeeIds]);

  const addablePayees = useMemo(
    () => payees.filter((p) => !batchPayeeIds.has(p.payeeId.toString()) && !stagedAddedPayeeIds.has(p.payeeId.toString())),
    [payees, batchPayeeIds, stagedAddedPayeeIds]
  );

  function stageAddPayeeToBatch(payeeIdRaw: string) {
    if (!payeeIdRaw) return;

    setStagedActions((prev) => {
      if (prev.some((a) => a.payload.payeeId.toString() === payeeIdRaw && a.payload.action === PayrollConfigActionKind.Upsert && a.payload.earningsCodeIds.length === 0)) {
        return prev;
      }

      const filtered = prev.filter(
        (a) =>
          !(
            a.payload.payeeId.toString() === payeeIdRaw &&
            a.payload.action === PayrollConfigActionKind.Remove &&
            a.payload.earningsCodeIds.length === 0
          )
      );
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return [
        ...filtered,
        {
          id,
          label: `Add payee #${payeeIdRaw} to pay batch`,
          payload: {
            action: PayrollConfigActionKind.Upsert,
            payeeId: ethers.BigNumber.from(payeeIdRaw),
            earningsCodeIds: [],
            rates: [],
            runData: [],
          },
        },
      ];
    });
  }

  function stageRemovePayeeFromBatch(payeeIdRaw: string) {
    if (!payeeIdRaw) return;

    setStagedActions((prev) => {
      if (
        stagedPayeeAdditions.has(payeeIdRaw)
      ) {
        return prev.filter(
          (a) =>
            !(
              a.payload.payeeId.toString() === payeeIdRaw &&
              ((a.payload.action === PayrollConfigActionKind.Upsert && a.payload.earningsCodeIds.length === 0) ||
                a.payload.earningsCodeIds.length > 0)
            )
        );
      }

      if (stagedPayeeRemovals.has(payeeIdRaw)) {
        return prev.filter(
          (a) =>
            !(
              a.payload.action === PayrollConfigActionKind.Remove &&
              a.payload.earningsCodeIds.length === 0 &&
              a.payload.payeeId.toString() === payeeIdRaw
            )
        );
      }

      const filtered = prev.filter(
        (a) => !(a.payload.payeeId.toString() === payeeIdRaw && a.payload.earningsCodeIds.length > 0)
      );

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return [
        ...filtered,
        {
          id,
          label: `Remove payee #${payeeIdRaw} from pay batch`,
          payload: {
            action: PayrollConfigActionKind.Remove,
            payeeId: ethers.BigNumber.from(payeeIdRaw),
            earningsCodeIds: [],
            rates: [],
            runData: [],
          },
        },
      ];
    });
  }

  function stageRemoveEarningFromBatch(payeeIdRaw: string, earningsCodeIdRaw: string) {
    if (!payeeIdRaw || !earningsCodeIdRaw) return;

    if (stagedEarningUpserts.get(payeeIdRaw)?.has(earningsCodeIdRaw)) {
      setStagedActions((prev) =>
        prev
          .map((action) => {
            if (
              action.payload.action !== PayrollConfigActionKind.Upsert ||
              action.payload.payeeId.toString() !== payeeIdRaw
            ) {
              return action;
            }

            const keptIndexes = action.payload.earningsCodeIds
              .map((id, idx) => ({ id: id.toString(), idx }))
              .filter((row) => row.id !== earningsCodeIdRaw)
              .map((row) => row.idx);

            if (keptIndexes.length === 0) return null;

            return {
              ...action,
              payload: {
                ...action.payload,
                earningsCodeIds: keptIndexes.map((idx) => action.payload.earningsCodeIds[idx]),
                rates: keptIndexes.map((idx) => action.payload.rates[idx]),
                runData: keptIndexes.map((idx) => action.payload.runData[idx]),
              },
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null)
      );
      return;
    }

    if (stagedEarningRemovals.get(payeeIdRaw)?.has(earningsCodeIdRaw)) {
      setStagedActions((prev) =>
        prev.filter(
          (action) =>
            !(
              action.payload.action === PayrollConfigActionKind.Remove &&
              action.payload.payeeId.toString() === payeeIdRaw &&
              action.payload.earningsCodeIds.some((id) => id.toString() === earningsCodeIdRaw)
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

  async function handleCreatePayBatch() {
    if (!chainId || !slug || !newBatchCode.trim()) return;
    await createPayBatch(chainId, slug, newBatchCode.trim());

    const nextCode = formatBatchCodeInput(newBatchCode.trim());
    setNewBatchCode("");
    await refreshData(slug, nextCode);
  }

  async function handleBatchConfigure() {
    if (!hasStagedChanges || isApplyingStaged || !selectedBatchCode || !slug) return;
    const success = await stagingManager.applyStagedChanges();
    if (success) {
      await refreshData(slug, selectedBatchCode);
    }
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 980, alignSelf: "center" }}>
          <CardContent>
            <PayrollNavigation slug={slug} active="payBatches" title="Pay Batches" />

            {!slug && <Text.Body color="warn">Missing organization slug in route.</Text.Body>}
            {slug && (
              <Text.Body color="muted">
                Organization: <strong>{slug}</strong>
              </Text.Body>
            )}
            {loading && <Text.Body color="muted">Loading pay batch data...</Text.Body>}

            {orgInfo && (
              <Stack
                style={{
                  padding: "var(--spacing-md)",
                  backgroundColor: "var(--colors-background)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <Text.Body>
                  <strong>Owner:</strong> {orgInfo.owner}
                </Text.Body>
                <Text.Body color={isAdmin ? "success" : "muted"}>
                  {isAdmin ? "✓ Admin Mode" : "Read Only Mode"}
                </Text.Body>
                <Text.Body color="muted" size="sm">
                  Batch codes: {batchCodes.length} · Payees: {payees.length} · Active earnings codes: {activeEarningsCodes.length}
                </Text.Body>
              </Stack>
            )}

            <Row gap="sm" align="end" wrap>
              <Stack style={{ minWidth: 280, flex: 1 }}>
                <Text.Body size="sm" color="muted">Selected Pay Batch</Text.Body>
                <Select<string>
                  value={selectedBatchCode}
                  onChange={(value) => setSelectedBatchCode(String(value))}
                  disabled={batchCodes.length === 0}
                >
                  {batchCodes.map((code) => (
                    <SelectOption key={code} value={code} label={parseBytes32Label(code)} />
                  ))}
                </Select>
              </Stack>

              {isAdmin && (
                <>
                  <Stack style={{ minWidth: 240, flex: 1 }}>
                    <Text.Body size="sm" color="muted">Create New Pay Batch</Text.Body>
                    <Input
                      value={newBatchCode}
                      onChange={(e) => setNewBatchCode(e.target.value)}
                      placeholder="OPS_BATCH"
                    />
                  </Stack>
                  <ButtonSecondary style={{ flex: 0 }} onClick={handleCreatePayBatch} disabled={!newBatchCode.trim() || !chainId}>
                    Create Batch
                  </ButtonSecondary>
                </>
              )}
            </Row>
          </CardContent>
        </Card>

        {selectedBatchCode && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Stack gap="md">
                <PayeesTable
                  payees={effectiveBatchPayees}
                  searchEnabled={true}
                  extraColumns={[
                    ...(isAdmin
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
                                    stageRemovePayeeFromBatch(payeeIdStr);
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
                    return isAdmin ? { removeAction: payeeId } : {};
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
                    const row = batchRowByPayeeId.get(payeeId);
                    const isStagedAdd = stagedPayeeAdditions.has(payeeId);
                    const isStagedPayeeRemoval = stagedPayeeRemovals.has(payeeId);
                    const payeeUpserts = stagedEarningUpserts.get(payeeId) ?? new Map<string, { rate: ethers.BigNumberish; runData: string }>();
                    const payeeRemovals = stagedEarningRemovals.get(payeeId) ?? new Set<string>();
                    const visibleOnChainEarnings = (row?.earnings ?? []).filter((earning) => {
                      if (!config?.weeklyScheduleRuleAddress) return true;
                      return earning.rule.toLowerCase() !== config.weeklyScheduleRuleAddress.toLowerCase();
                    });
                    const onChainCodeIds = new Set(visibleOnChainEarnings.map((e) => e.earningsCodeId.toString()));
                    const newStagedEarnings = Array.from(payeeUpserts.entries()).filter(([codeId]) => !onChainCodeIds.has(codeId));

                    return (
                      <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
                        <CardContent>
                          <Stack gap="sm">
                            <Text.Label>Batch Default Earnings</Text.Label>
                            {isStagedAdd && (
                              <Text.Body size="sm" color="success">+ Staged: this payee will be added to the pay batch</Text.Body>
                            )}
                            {isStagedPayeeRemoval && (
                              <Text.Body size="sm" color="danger">- Staged: this payee and all batch earnings will be removed</Text.Body>
                            )}
                            {isAdmin && !isStagedPayeeRemoval && (
                              <EarningsDividerButton
                                label="+ Add Default Earning"
                                onClick={() => openAddEarningModal(payeeId)}
                                minWidth={170}
                              />
                            )}
                            {visibleOnChainEarnings.length === 0 && newStagedEarnings.length === 0 ? (
                              <Text.Body color="muted">No earnings assigned.</Text.Body>
                            ) : (
                              <Stack gap="sm">
                                {visibleOnChainEarnings.map((earning, index) => {
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
                                        {isAdmin && !isStagedPayeeRemoval && (
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
                                                onClick={() =>
                                                  openEditEarningModal(
                                                    payeeId,
                                                    codeId,
                                                    overrideData?.rate ?? earning.rate,
                                                    overrideData?.runData ?? earning.runData
                                                  )
                                                }
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
                                              onClick={() => stageRemoveEarningFromBatch(payeeId, codeId)}
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
                                          <Text.Body size="sm" color="muted">
                                            Rate: {overrideData
                                              ? `${ethers.utils.formatEther(overrideData.rate as ethers.BigNumberish)} (staged)`
                                              : formatRate(earning.rate)}
                                          </Text.Body>
                                          {(ruleMeta.runDataRequired || (ruleMeta.kind === "custom" && earning.runData !== "0x")) && (
                                            <Text.Body size="sm" color="muted">Run Data: {decodeRunDataDisplay(earning.runData, earning.rule, config)}</Text.Body>
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
                                        {isAdmin && !isStagedPayeeRemoval && (
                                          <IconButton
                                            size="xl"
                                            iconFontSize="xl"
                                            shape="square"
                                            aria-label="Remove staged earning"
                                            title="Remove staged earning"
                                            onClick={() => stageRemoveEarningFromBatch(payeeId, codeId)}
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
                                          {!isStagedPayeeRemoval && isAdmin && (
                                            <Row gap="xs" justify="end">
                                              <IconButton
                                                size="xl"
                                                iconFontSize="xl"
                                                shape="rounded"
                                                aria-label="Edit staged earning"
                                                title="Edit staged earning"
                                                onClick={() =>
                                                  openEditEarningModal(
                                                    payeeId,
                                                    codeId,
                                                    upsert.rate,
                                                    upsert.runData
                                                  )
                                                }
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

                {isAdmin && (
                  <Stack gap="xs" style={{ maxWidth: 420 }}>
                    <Row gap="sm" align="center" wrap>
                      <div style={{ flex: 1, minWidth: 180, maxWidth: 260 }}>
                        <Select<string>
                          value={selectedPayeeId || null}
                          onChange={(value) => setSelectedPayeeId(String(value ?? ""))}
                          disabled={addablePayees.length === 0}
                        >
                          {addablePayees.map((payee) => (
                            <SelectOption
                              key={payee.payeeId.toString()}
                              value={payee.payeeId.toString()}
                              label={`${parsePayeeNameLabel(payee.role)} · #${payee.payeeId.toString()}`}
                            />
                          ))}
                        </Select>
                      </div>
                      <ButtonSecondary
                        style={{ flex: 0 }}
                        onClick={() => stageAddPayeeToBatch(selectedPayeeId)}
                        disabled={!selectedPayeeId || addablePayees.length === 0}
                      >
                        + Add Payee
                      </ButtonSecondary>
                    </Row>
                    {addablePayees.length === 0 && (
                      <Text.Body size="sm" color="muted">All organization payees are already in this pay batch.</Text.Body>
                    )}
                  </Stack>
                )}

                <Row justify="end" gap="sm">
                  <ButtonSecondary style={{ flex: 0 }} onClick={clearStaged} disabled={!hasStagedChanges || isApplyingStaged}>
                    Clear
                  </ButtonSecondary>
                  <ButtonPrimary
                    style={{ flex: 0 }}
                    onClick={handleBatchConfigure}
                    disabled={!isAdmin || !chainId || !selectedBatchCode || !hasStagedChanges || isApplyingStaged}
                  >
                    {isApplyingStaged ? "Applying..." : "Apply"}
                  </ButtonPrimary>
                </Row>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Modal
          isOpen={earningModal.isOpen}
          onClose={closeEarningModal}
          title={earningModal.lockedCodeId ? "Edit Default Earning" : "Add Default Earning"}
          width={620}
        >
          <Stack gap="md">
            <Text.Body color="muted" size="sm">
              Payee: #{earningModal.payee?.payeeId?.toString() ?? "-"} · {parsePayeeNameLabel(earningModal.payee?.role ?? "")}
            </Text.Body>

            <Stack>
              <Text.Body size="sm" color="muted">Earnings Code</Text.Body>
              <Select<string>
                value={modalCodeId || null}
                onChange={(v) => setModalCodeId(String(v ?? ""))}
                disabled={Boolean(earningModal.lockedCodeId)}
              >
                {availableModalCodes.map((code) => (
                  <SelectOption
                    key={code.earningsCodeId.toString()}
                    value={code.earningsCodeId.toString()}
                    label={`${formatEarningsCodeIdLabel(code.earningsCodeId)} · ${formatEarningsCodeName(code.name)} · ${buildRuleMeta(code.rule, config).name}`}
                  />
                ))}
              </Select>
            </Stack>

            <Stack>
              <Text.Body size="sm" color="muted">Rate</Text.Body>
              <Input
                value={modalRate}
                onChange={(e) => setModalRate(e.target.value)}
                placeholder="e.g. 20"
              />
            </Stack>

            {selectedModalRuleMeta.kind === "hourly" && (
              <Stack>
                <Text.Body size="sm" color="muted">Hours Worked (runData)</Text.Body>
                <NumberInput
                  value={modalHourlyRunData}
                  onChange={(e) => setModalHourlyRunData((e.target as HTMLInputElement).value)}
                  allowDecimal={false}
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
                />
              </Stack>
            )}

            <Row justify="end" gap="sm">
              <ButtonSecondary style={{ flex: 0 }} onClick={closeEarningModal}>
                Close
              </ButtonSecondary>
              <ButtonPrimary
                style={{ flex: 0 }}
                onClick={stageEarningFromModal}
                disabled={!modalCodeId}
              >
                Stage Change
              </ButtonPrimary>
            </Row>
          </Stack>
        </Modal>
      </Stack>
    </PageContainer>
  );
}
