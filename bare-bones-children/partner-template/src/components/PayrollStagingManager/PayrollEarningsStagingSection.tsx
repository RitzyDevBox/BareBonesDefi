import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Modal } from "../Modal/Modal";
import { Sheet } from "../Primitives/Sheet";
import { CopyButton } from "../Button/Actions/CopyButton";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import { EditableEarningsPanel } from "../PayrollEarningsManager";
import type { TableColumn } from "../Table";
import type { PayeeModel } from "../../models/payments";
import { shortAddress } from "../../utils/formatUtils";
import {
  buildRuleMeta,
  decodeConfigDisplay,
  RuleKind,
  DEFAULT_HOURS,
} from "../../utils/payroll/earningsDisplay";
import { ScheduleGrid } from "../Schedule/ScheduleGrid";
import {
  formatEarningsCodeIdLabel,
  formatEarningsCodeName,
} from "../../utils/payroll/earningsCodeDisplay";
import {
  parsePayeeNameLabel,
} from "../../utils/payroll/payrollFormatters";
import {
  EditablePayrollTable,
} from "./EditablePayrollTable";
import {
  usePayrollStagingManager,
  type PayrollConfigActionPayload,
} from "./PayrollStagingManager";

export interface StagingEarningSourceRow {
  earningsCodeId: ethers.BigNumberish;
  name?: string;
  rule: string;
  rate: ethers.BigNumberish;
  config: string;
  runData: string;
  source?: number;
}

interface EarningsCodeOption {
  earningsCodeId: ethers.BigNumberish;
  isActive: boolean;
  name: string;
  rule: string;
  config: string;
}

interface PayrollEarningsStagingSectionProps {
  payees: PayeeModel[];
  loading?: boolean;
  baseIncludedPayeeIds: Set<string>;
  canEdit: boolean;
  searchEnabled?: boolean;
  headerActions?: React.ReactNode;
  extraColumns?: TableColumn[];
  getExtraCells?: (payee: PayeeModel) => Record<string, any>;

  formatAddPayeeLabel?: (payee: PayeeModel) => string;
  addableEmptyMessage?: string;
  addSelectMinWidth?: number;
  addSelectCompact?: boolean;
  disableAddPayee?: boolean;

  panelTitle: string;
  panelAddLabel: string;
  getOnChainEarnings: (payee: PayeeModel) => StagingEarningSourceRow[];
  earningsCodes: EarningsCodeOption[];
  config: any;

  onSave: (actions: PayrollConfigActionPayload[]) => Promise<boolean>;
  onAfterApply?: () => Promise<void> | void;
  onStagingMetaChange?: (meta: {
    hasStagedChanges: boolean;
    stagedCount: number;
    isApplying: boolean;
  }) => void;
  disableApply?: boolean;
}

enum EarningsModalMode {
  Override = "override",
  Additional = "additional",
}


function cloneWeeklyMask(mask?: boolean[]) {
  const next = new Array<boolean>(168).fill(false);
  if (!mask) return next;
  for (let i = 0; i < Math.min(mask.length, 168); i += 1) next[i] = Boolean(mask[i]);
  return next;
}

function maskToUint168(mask: boolean[]) {
  let bits = 0n;
  for (let i = 0; i < 168; i += 1) {
    if (mask[i]) bits |= 1n << BigInt(i);
  }
  return bits.toString();
}

function uint168ToMask(value: string) {
  const mask = new Array<boolean>(168).fill(false);
  let bits = BigInt(value || "0");
  for (let i = 0; i < 168; i += 1) {
    mask[i] = (bits & 1n) === 1n;
    bits >>= 1n;
  }
  return mask;
}

function countWeeklyMaskHours(mask: boolean[]) {
  return mask.reduce((acc, bit) => (bit ? acc + 1 : acc), 0);
}

interface EarningsModalState {
  isOpen: boolean;
  mode: EarningsModalMode;
  payee: PayeeModel | null;
  earning: StagingEarningSourceRow | null;
}

export function PayrollEarningsStagingSection({
  payees,
  loading = false,
  baseIncludedPayeeIds,
  canEdit,
  searchEnabled = true,
  headerActions,
  extraColumns = [],
  getExtraCells,
  formatAddPayeeLabel = (payee) =>
    `${parsePayeeNameLabel(payee.role)} · #${payee.payeeId.toString()}`,
  addableEmptyMessage,
  addSelectMinWidth = 180,
  addSelectCompact = false,
  disableAddPayee = false,
  panelTitle,
  panelAddLabel,
  getOnChainEarnings,
  earningsCodes,
  config,
  onSave,
  onAfterApply,
  onStagingMetaChange,
  disableApply = false,
}: PayrollEarningsStagingSectionProps) {
  const screenSize = useMediaQuery();
  const isMobile = screenSize === ScreenSize.Phone;
  const stagingManager = usePayrollStagingManager(onSave);
  const {
    stagedActions,
    isApplying,
    hasStagedChanges,
    stagedPayeeRemovals,
    stagedPayeeAdditions,
    stagedEarningRemovals,
    stagedEarningUpserts,
    stagePayeeAddition,
    togglePayeeRemoval,
    toggleEarningRemoval,
    stageOrReplaceEarningUpsert,
    clearStaged,
    applyStagedChanges,
  } = stagingManager;

  const [selectedAddPayeeId, setSelectedAddPayeeId] = useState("");
  const [earningsModal, setEarningsModal] = useState<EarningsModalState>({
    isOpen: false,
    mode: EarningsModalMode.Override,
    payee: null,
    earning: null,
  });
  const [modalCodeId, setModalCodeId] = useState("");
  const [modalRate, setModalRate] = useState("0");
  const [modalHourlyRunData, setModalHourlyRunData] = useState(DEFAULT_HOURS);
  const [modalRawRunData, setModalRawRunData] = useState("0x");
  const [modalWeeklyWorkedMask, setModalWeeklyWorkedMask] = useState<boolean[]>(
    new Array<boolean>(168).fill(false)
  );

  useEffect(() => {
    onStagingMetaChange?.({
      hasStagedChanges,
      stagedCount: stagedActions.length,
      isApplying,
    });
  }, [hasStagedChanges, stagedActions.length, isApplying, onStagingMetaChange]);

  const effectivePayees = useMemo(() => {
    const base = payees.filter((payee) => baseIncludedPayeeIds.has(payee.payeeId.toString()));
    const baseIds = new Set(base.map((payee) => payee.payeeId.toString()));
    const stagedAdded = payees.filter(
      (payee) =>
        stagedPayeeAdditions.has(payee.payeeId.toString()) &&
        !baseIds.has(payee.payeeId.toString())
    );
    return [...base, ...stagedAdded];
  }, [payees, baseIncludedPayeeIds, stagedPayeeAdditions]);

  const addablePayees = useMemo(
    () =>
      payees.filter(
        (p) =>
          !baseIncludedPayeeIds.has(p.payeeId.toString()) &&
          !stagedPayeeAdditions.has(p.payeeId.toString())
      ),
    [payees, baseIncludedPayeeIds, stagedPayeeAdditions]
  );

  const earningsCodeById = useMemo(
    () => new Map(earningsCodes.map((code) => [code.earningsCodeId.toString(), code] as const)),
    [earningsCodes]
  );

  const activeEarningsCodes = useMemo(
    () => earningsCodes.filter((code) => code.isActive),
    [earningsCodes]
  );

  useEffect(() => {
    if (
      selectedAddPayeeId &&
      addablePayees.some((row) => row.payeeId.toString() === selectedAddPayeeId)
    ) {
      return;
    }
    setSelectedAddPayeeId(addablePayees[0]?.payeeId?.toString() ?? "");
  }, [selectedAddPayeeId, addablePayees]);

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

  const modalWeeklyPremiumMask = useMemo(() => {
    if (selectedModalRuleMeta.kind !== RuleKind.Weekly) {
      return new Array<boolean>(168).fill(false);
    }
    if (!selectedModalCode?.config || selectedModalCode.config === "0x") {
      return new Array<boolean>(168).fill(false);
    }

    try {
      const decoded = ethers.utils.defaultAbiCoder.decode(
        ["uint168[]", "uint16[]"],
        selectedModalCode.config
      );
      const masks = (decoded?.[0] ?? []) as ethers.BigNumber[];
      const union = new Array<boolean>(168).fill(false);

      for (const maskValue of masks) {
        const mask = uint168ToMask(maskValue.toString());
        for (let i = 0; i < 168; i += 1) {
          if (mask[i]) union[i] = true;
        }
      }
      return union;
    } catch {
      return new Array<boolean>(168).fill(false);
    }
  }, [selectedModalRuleMeta.kind, selectedModalCode]);

  const weeklyPremiumRateLabel = useMemo(() => {
    if (selectedModalRuleMeta.kind !== RuleKind.Weekly) return "-";
    if (!selectedModalCode?.config || selectedModalCode.config === "0x") return "-";

    try {
      const decoded = ethers.utils.defaultAbiCoder.decode(
        ["uint168[]", "uint16[]"],
        selectedModalCode.config
      );
      const bpsValues = (decoded?.[1] ?? []) as ethers.BigNumber[];
      if (bpsValues.length === 0) return "-";

      const rates = Array.from(
        new Set(
          bpsValues.map((bps) => {
            const value = Number(bps.toString()) / 10_000;
            const fixed = value.toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
            return `${fixed}x`;
          })
        )
      );
      return rates.join(", ");
    } catch {
      return "-";
    }
  }, [selectedModalRuleMeta.kind, selectedModalCode]);

  const weeklyScheduledHours = useMemo(
    () => countWeeklyMaskHours(modalWeeklyWorkedMask),
    [modalWeeklyWorkedMask]
  );

  const weeklyPremiumOverlapHours = useMemo(() => {
    let total = 0;
    for (let i = 0; i < 168; i += 1) {
      if (modalWeeklyWorkedMask[i] && modalWeeklyPremiumMask[i]) total += 1;
    }
    return total;
  }, [modalWeeklyWorkedMask, modalWeeklyPremiumMask]);

  const weeklyStandardHours = useMemo(
    () => Math.max(0, weeklyScheduledHours - weeklyPremiumOverlapHours),
    [weeklyScheduledHours, weeklyPremiumOverlapHours]
  );

  const additionalModalCodes = useMemo(() => {
    if (earningsModal.mode !== EarningsModalMode.Additional || !earningsModal.payee) {
      return [] as EarningsCodeOption[];
    }

    const payeeId = earningsModal.payee.payeeId.toString();
    const takenCodeIds = new Set<string>();

    for (const earning of getOnChainEarnings(earningsModal.payee)) {
      takenCodeIds.add(earning.earningsCodeId.toString());
    }

    for (const codeId of stagedEarningUpserts.get(payeeId)?.keys() ?? []) {
      takenCodeIds.add(codeId);
    }

    const filtered = activeEarningsCodes.filter(
      (row) => !takenCodeIds.has(row.earningsCodeId.toString())
    );

    if (modalCodeId) {
      const selected = activeEarningsCodes.find(
        (row) => row.earningsCodeId.toString() === modalCodeId
      );
      if (
        selected &&
        !filtered.some((row) => row.earningsCodeId.toString() === selected.earningsCodeId.toString())
      ) {
        return [selected, ...filtered];
      }
    }

    return filtered;
  }, [
    earningsModal,
    getOnChainEarnings,
    stagedEarningUpserts,
    activeEarningsCodes,
    modalCodeId,
  ]);

  function closeEarningsModal() {
    setEarningsModal({
      isOpen: false,
      mode: EarningsModalMode.Override,
      payee: null,
      earning: null,
    });
  }

  function openAddEarningModal(payee: PayeeModel) {
    setEarningsModal({
      isOpen: true,
      mode: EarningsModalMode.Additional,
      payee,
      earning: null,
    });

    const payeeId = payee.payeeId.toString();
    const taken = new Set<string>();
    for (const earning of getOnChainEarnings(payee)) {
      taken.add(earning.earningsCodeId.toString());
    }
    for (const codeId of stagedEarningUpserts.get(payeeId)?.keys() ?? []) {
      taken.add(codeId);
    }

    const firstCode = activeEarningsCodes.find(
      (code) => !taken.has(code.earningsCodeId.toString())
    );

    setModalCodeId(firstCode?.earningsCodeId?.toString() ?? "");
    setModalRate("0");
    setModalRawRunData("0x");
    setModalHourlyRunData(DEFAULT_HOURS);
    setModalWeeklyWorkedMask(new Array<boolean>(168).fill(false));
  }

  function openEditEarningModal(
    payee: PayeeModel,
    earning: StagingEarningSourceRow,
    staged: { rate: ethers.BigNumberish; runData: string }
  ) {
    setEarningsModal({
      isOpen: true,
      mode: EarningsModalMode.Override,
      payee,
      earning,
    });

    const codeId = earning.earningsCodeId.toString();
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
      if (ruleMeta.kind === RuleKind.Hourly && staged.runData && staged.runData !== "0x") {
        const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], staged.runData);
        setModalHourlyRunData(String(Number((decoded?.[0] as ethers.BigNumber).toString())));
        setModalWeeklyWorkedMask(new Array<boolean>(168).fill(false));
      } else if (ruleMeta.kind === RuleKind.Weekly && staged.runData && staged.runData !== "0x") {
        const decoded = ethers.utils.defaultAbiCoder.decode(["uint168[]"], staged.runData);
        const workedMasks = (decoded?.[0] ?? []) as ethers.BigNumber[];
        const firstWeekMask = workedMasks[0]?.toString() ?? "0";
        setModalWeeklyWorkedMask(uint168ToMask(firstWeekMask));
      } else {
        setModalHourlyRunData(DEFAULT_HOURS);
        setModalWeeklyWorkedMask(new Array<boolean>(168).fill(false));
      }
    } catch {
      setModalHourlyRunData(DEFAULT_HOURS);
      setModalWeeklyWorkedMask(new Array<boolean>(168).fill(false));
    }
  }

  function setWeeklyWorkedHour(dayIndex: number, hour: number, value: boolean) {
    const idx = dayIndex * 24 + hour;
    setModalWeeklyWorkedMask((prev) => {
      const next = cloneWeeklyMask(prev);
      next[idx] = value;
      return next;
    });
  }

  function resolveModalRunData() {
    if (selectedModalRuleMeta.kind === RuleKind.Hourly) {
      return ethers.utils.defaultAbiCoder.encode(["uint32"], [
        Math.max(0, Math.floor(Number(modalHourlyRunData) || 0)),
      ]);
    }

    if (selectedModalRuleMeta.kind === RuleKind.Weekly) {
      const weekMask = maskToUint168(modalWeeklyWorkedMask);
      return ethers.utils.defaultAbiCoder.encode(["uint168[]"], [[weekMask]]);
    }

    if (selectedModalRuleMeta.kind === RuleKind.Custom) {
      return modalRawRunData?.trim() || "0x";
    }

    return "0x";
  }

  function handleSubmitEarning() {
    if (!earningsModal.payee) return;

    const payeeId = earningsModal.payee.payeeId.toString();
    if (stagedPayeeRemovals.has(payeeId)) return;

    const runData = resolveModalRunData();

    if (earningsModal.mode === EarningsModalMode.Override) {
      const codeId = earningsModal.earning?.earningsCodeId.toString() ?? modalCodeId;
      if (!codeId) return;

      stageOrReplaceEarningUpsert(
        payeeId,
        codeId,
        ethers.utils.parseEther(modalRate || "0"),
        runData,
        `Upsert earning code ${formatEarningsCodeIdLabel(codeId)} for payee #${payeeId}`
      );
      closeEarningsModal();
      return;
    }

    if (earningsModal.mode === EarningsModalMode.Additional) {
      if (!selectedModalCode) return;

      const selectedCodeId = selectedModalCode.earningsCodeId.toString();
      stageOrReplaceEarningUpsert(
        payeeId,
        selectedCodeId,
        ethers.utils.parseEther(modalRate || "0"),
        runData,
        `Add/Upsert earning code ${formatEarningsCodeIdLabel(selectedCodeId)} for payee #${payeeId}`
      );
      closeEarningsModal();
    }
  }

  async function handleApply() {
    if (isApplying || !hasStagedChanges) return;
    const success = await applyStagedChanges();
    if (success) {
      await onAfterApply?.();
    }
  }

  const earningsModalTitle =
    earningsModal.mode === EarningsModalMode.Override
      ? "Override Earnings"
      : "Add Additional Earnings";

  const codeOptions =
    earningsModal.mode === EarningsModalMode.Additional
      ? additionalModalCodes
      : earningsModal.earning
        ? [
            {
              earningsCodeId: earningsModal.earning.earningsCodeId,
              isActive: true,
              name: earningsModal.earning.name ?? "",
              rule: earningsModal.earning.rule,
              config: earningsModal.earning.config,
            },
          ]
        : [];

  const earningsModalContent = (
    <Stack gap="md">
      <Text.Body color="muted" size="sm">
        Payee: #{earningsModal.payee?.payeeId?.toString() ?? "-"} ·{" "}
        {parsePayeeNameLabel(earningsModal.payee?.role ?? "")}
      </Text.Body>

      <div className="bb-field-grid" style={{ gap: 16 }}>
        <div className="bb-field bb-full">
          <label>Earnings Code</label>
          <select
            className="bb-input bb-mono"
            value={modalCodeId}
            onChange={(e) => setModalCodeId(e.target.value)}
            disabled={!canEdit || earningsModal.mode !== EarningsModalMode.Additional}
          >
            {!modalCodeId && <option value="">— select an earnings code —</option>}
            {codeOptions.map((code) => (
              <option key={code.earningsCodeId.toString()} value={code.earningsCodeId.toString()}>
                {formatEarningsCodeIdLabel(code.earningsCodeId)} ·{" "}
                {formatEarningsCodeName(code.name)} · {buildRuleMeta(code.rule, config).name}
              </option>
            ))}
          </select>
          <div
            className="bb-field-hint"
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            <span>Rule: {selectedModalRuleMeta.name}</span>
            <span>·</span>
            <span style={{ color: "var(--bb-text)" }}>{shortAddress(selectedModalRule)}</span>
            <CopyButton value={selectedModalRule} ariaLabel="Copy rule address" />
          </div>
        </div>

        {selectedModalRuleMeta.configRequired && selectedModalCode && (
          <div className="bb-field bb-full">
            <label>Code Config</label>
            <div
              style={{
                fontFamily: "var(--bb-font-mono)",
                fontSize: 12.5,
                color: "var(--bb-text-dim)",
                background: "var(--bb-bg)",
                border: "1px solid var(--bb-line)",
                borderRadius: 8,
                padding: "10px 12px",
                wordBreak: "break-word",
              }}
            >
              {decodeConfigDisplay(selectedModalCode.config, selectedModalCode.rule, config)}
            </div>
          </div>
        )}

        <div className="bb-field">
          <label>Rate</label>
          <input
            className="bb-input bb-mono"
            value={modalRate}
            onChange={(e) => setModalRate(e.target.value)}
            placeholder="e.g. 20"
            disabled={!canEdit}
            inputMode="decimal"
          />
          <div className="bb-field-hint">Per-payee rate. Encoded as wei.</div>
        </div>

        {selectedModalRuleMeta.kind === RuleKind.Hourly && (
          <div className="bb-field">
            <label>Hours Worked</label>
            <input
              className="bb-input bb-mono"
              value={modalHourlyRunData}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "" || /^\d*$/.test(next)) {
                  setModalHourlyRunData(next);
                }
              }}
              placeholder="0"
              disabled={!canEdit}
              inputMode="numeric"
            />
            <div className="bb-field-hint">Encoded as uint32 hours (runData).</div>
          </div>
        )}

        {selectedModalRuleMeta.kind === RuleKind.Custom && (
          <div className="bb-field bb-full">
            <label>Run Data (raw hex)</label>
            <input
              className="bb-input bb-mono"
              value={modalRawRunData}
              onChange={(e) => setModalRawRunData(e.target.value)}
              placeholder="0x"
              disabled={!canEdit}
            />
            <div className="bb-field-hint">Encoded into runData as-is.</div>
          </div>
        )}

        {selectedModalRuleMeta.kind === RuleKind.PerPayroll && (
          <div className="bb-field bb-full">
            <div className="bb-ec-onetime">
              <span className="bb-ec-onetime-icon" aria-hidden>•</span>
              <div className="bb-ec-onetime-body">
                <b>No run data needed.</b>
                <span className="bb-muted bb-small">
                  Per-payroll earnings only need a rate — the on-chain rule reads the raw amount at
                  finalize.
                </span>
              </div>
            </div>
          </div>
        )}

        {selectedModalRuleMeta.kind === RuleKind.Weekly && (
          <div className="bb-field bb-full">
            <div className="bb-ec-bands">
              <div className="bb-ec-bands-head">
                <span className="bb-ec-bands-title">Hours worked this cycle</span>
                <button
                  type="button"
                  className="bb-btn-ghost bb-btn-xs"
                  onClick={() =>
                    setModalWeeklyWorkedMask(new Array<boolean>(168).fill(false))
                  }
                  disabled={!canEdit}
                >
                  Clear hours
                </button>
              </div>

              <div
                className="bb-field-hint"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  textTransform: "none",
                  letterSpacing: 0,
                  marginBottom: 10,
                }}
              >
                <span>Premium rate: <b style={{ color: "var(--bb-text)" }}>{weeklyPremiumRateLabel}</b></span>
                <span>·</span>
                <span>Scheduled: <b style={{ color: "var(--bb-text)" }}>{weeklyScheduledHours}h</b></span>
                <span>·</span>
                <span>Standard: <b style={{ color: "var(--bb-text)" }}>{weeklyStandardHours}h</b></span>
                <span>·</span>
                <span>Premium overlap: <b style={{ color: "var(--bb-text)" }}>{weeklyPremiumOverlapHours}h</b></span>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <ScheduleGrid
                  mask={modalWeeklyWorkedMask}
                  onChange={setWeeklyWorkedHour}
                  disabled={!canEdit}
                  overlapMask={modalWeeklyPremiumMask}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Row justify="end" gap="sm" style={{ marginTop: 4 }}>
        <ButtonSecondary style={{ flex: 0, minWidth: 120 }} onClick={closeEarningsModal}>
          Close
        </ButtonSecondary>
        {canEdit && (
          <ButtonPrimary
            style={{ flex: 0, minWidth: 120 }}
            onClick={handleSubmitEarning}
            disabled={
              earningsModal.mode === EarningsModalMode.Additional && !selectedModalCode
            }
          >
            Stage
          </ButtonPrimary>
        )}
      </Row>
    </Stack>
  );

  return (
    <>
      <EditablePayrollTable
        payees={effectivePayees}
        loading={loading}
        searchEnabled={searchEnabled}
        headerActions={headerActions}
        canEdit={canEdit}
        stagedPayeeRemovals={stagedPayeeRemovals}
        stagedPayeeAdditions={stagedPayeeAdditions}
        extraColumns={extraColumns}
        getExtraCells={getExtraCells}
        onTogglePayeeRemoval={(payeeId) =>
          togglePayeeRemoval(payeeId, `Remove payee #${payeeId}`)
        }
        renderExpandedRow={(payee) => {
          const payeeId = payee.payeeId.toString();
          const isStagedAdd = stagedPayeeAdditions.has(payeeId);
          const isStagedPayeeRemoval = stagedPayeeRemovals.has(payeeId);
          const payeeUpserts =
            stagedEarningUpserts.get(payeeId) ??
            new Map<string, { rate: ethers.BigNumberish; runData: string }>();
          const payeeRemovals = stagedEarningRemovals.get(payeeId) ?? new Set<string>();

          const onChainItems = getOnChainEarnings(payee).map((earning) => ({
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
              title={panelTitle}
              addLabel={panelAddLabel}
              canEdit={canEdit}
              isStagedAdd={isStagedAdd}
              isStagedPayeeRemoval={isStagedPayeeRemoval}
              onChainEarnings={onChainItems}
              stagedUpserts={payeeUpserts}
              stagedRemovals={payeeRemovals}
              earningsCodeById={earningsCodeById}
              config={config}
              onAdd={() => openAddEarningModal(payee)}
              onEdit={(item, staged) => {
                const source = getOnChainEarnings(payee).find(
                  (row) => row.earningsCodeId.toString() === item.codeId
                ) ?? {
                  earningsCodeId: item.codeId,
                  name: item.name,
                  rule: item.rule,
                  rate: item.rate,
                  config: item.config,
                  runData: item.runData,
                  source: item.source,
                };

                openEditEarningModal(payee, source, staged);
              }}
              onToggleRemove={(codeId) =>
                toggleEarningRemoval(
                  payeeId,
                  codeId,
                  `Remove earning code ${formatEarningsCodeIdLabel(codeId)} for payee #${payeeId}`
                )
              }
            />
          );
        }}
        showAddSection={canEdit}
        addablePayees={addablePayees}
        selectedAddPayeeId={selectedAddPayeeId}
        onSelectedAddPayeeIdChange={setSelectedAddPayeeId}
        formatAddPayeeLabel={formatAddPayeeLabel}
        onAddPayee={() =>
          stagePayeeAddition(selectedAddPayeeId, `Add payee #${selectedAddPayeeId}`)
        }
        addableEmptyMessage={addableEmptyMessage}
        addSelectMinWidth={addSelectMinWidth}
        addSelectCompact={addSelectCompact}
        disableAddPayee={disableAddPayee || isApplying}
        showActionsRow={canEdit && (hasStagedChanges || isApplying)}
        isApplyingStaged={isApplying}
        onClearStaged={clearStaged}
        onApplyStaged={handleApply}
        disableClear={isApplying || !hasStagedChanges}
        disableApply={disableApply || isApplying || !hasStagedChanges}
      />

      {isMobile ? (
        <Sheet open={earningsModal.isOpen} onClose={closeEarningsModal} placement="bottom">
          <Text.Label>{earningsModalTitle}</Text.Label>
          <div style={{ height: 8 }} />
          {earningsModalContent}
        </Sheet>
      ) : (
        <Modal
          isOpen={earningsModal.isOpen}
          onClose={closeEarningsModal}
          title={earningsModalTitle}
          width={620}
        >
          {earningsModalContent}
        </Modal>
      )}
    </>
  );
}
