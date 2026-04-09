import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Input } from "../BasicComponents";
import { Modal } from "../Modal/Modal";
import { Sheet } from "../Primitives/Sheet";
import { NumberInput } from "../Inputs/NumberInput";
import { CopyButton } from "../Button/Actions/CopyButton";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { Select, SelectOption } from "../Select";
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
  extraColumns?: TableColumn[];
  getExtraCells?: (payee: PayeeModel) => Record<string, any>;

  formatAddPayeeLabel?: (payee: PayeeModel) => string;
  addPayeeButtonLabel?: string;
  addableEmptyMessage?: string;
  addSectionMaxWidth?: number;
  addSelectMinWidth?: number;
  addSelectMaxWidth?: number;
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
  extraColumns = [],
  getExtraCells,
  formatAddPayeeLabel = (payee) =>
    `${parsePayeeNameLabel(payee.role)} · #${payee.payeeId.toString()}`,
  addPayeeButtonLabel = "+ Add Payee",
  addableEmptyMessage,
  addSectionMaxWidth = 420,
  addSelectMinWidth = 180,
  addSelectMaxWidth = 260,
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
    const ids = new Set<string>(baseIncludedPayeeIds);
    for (const id of stagedPayeeAdditions.values()) ids.add(id);
    return payees.filter((payee) => ids.has(payee.payeeId.toString()));
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

  const earningsModalContent = (
    <Stack gap="md">
      <Text.Body color="muted" size="sm">
        Payee: #{earningsModal.payee?.payeeId?.toString() ?? "-"} · {parsePayeeNameLabel(earningsModal.payee?.role ?? "")}
      </Text.Body>

      <Stack>
        <Text.Body size="sm" color="muted">Earnings Code</Text.Body>
        <Select<string>
          value={modalCodeId || null}
          onChange={(v) => setModalCodeId(String(v ?? ""))}
          disabled={!canEdit || earningsModal.mode !== EarningsModalMode.Additional}
        >
          {(earningsModal.mode === EarningsModalMode.Additional
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
          disabled={!canEdit}
        />
      </Stack>

      {selectedModalRuleMeta.kind === RuleKind.Hourly && (
        <Stack>
          <Text.Body size="sm" color="muted">Hours Worked (runData)</Text.Body>
          <NumberInput
            value={modalHourlyRunData}
            onChange={(e) =>
              setModalHourlyRunData((e.target as HTMLInputElement).value)
            }
            allowDecimal={false}
            disabled={!canEdit}
          />
        </Stack>
      )}

      {selectedModalRuleMeta.kind === RuleKind.Custom && (
        <Stack>
          <Text.Body size="sm" color="muted">Run Data (raw hex)</Text.Body>
          <Input
            value={modalRawRunData}
            onChange={(e) => setModalRawRunData(e.target.value)}
            placeholder="0x"
            disabled={!canEdit}
          />
        </Stack>
      )}

      {selectedModalRuleMeta.kind === RuleKind.Weekly && (
        <Stack gap="sm">
          <Row justify="between" align="center" wrap>
            <Stack gap="xs">
              <Text.Body size="sm" color="muted">Premium Rate: {weeklyPremiumRateLabel}</Text.Body>
              <Text.Body size="sm" color="muted">Schedule Hours: {weeklyScheduledHours}h</Text.Body>
              <Text.Body size="sm" color="muted">Standard Hours: {weeklyStandardHours}h</Text.Body>
              <Text.Body size="sm" color="muted">Premium Overlap: {weeklyPremiumOverlapHours}h</Text.Body>
            </Stack>
            <Row gap="sm" align="center" wrap>
              <ButtonSecondary
                style={{ flex: 0 }}
                onClick={() => setModalWeeklyWorkedMask(new Array<boolean>(168).fill(false))}
                disabled={!canEdit}
              >
                Clear
              </ButtonSecondary>
            </Row>
          </Row>

          <Stack
            style={{
              border: "1px solid var(--colors-border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--spacing-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ScheduleGrid
                mask={modalWeeklyWorkedMask}
                onChange={setWeeklyWorkedHour}
                disabled={!canEdit}
                forceRows12
                overlapMask={modalWeeklyPremiumMask}
              />
            </div>
          </Stack>
        </Stack>
      )}

      <Row justify="end" gap="sm">
        <ButtonSecondary style={{ flex: 0 }} onClick={closeEarningsModal}>
          Close
        </ButtonSecondary>
        {canEdit && (
          <ButtonPrimary
            style={{ flex: 0 }}
            onClick={handleSubmitEarning}
            disabled={earningsModal.mode === EarningsModalMode.Additional && !selectedModalCode}
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
        addPayeeButtonLabel={addPayeeButtonLabel}
        addableEmptyMessage={addableEmptyMessage}
        addSectionMaxWidth={addSectionMaxWidth}
        addSelectMinWidth={addSelectMinWidth}
        addSelectMaxWidth={addSelectMaxWidth}
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
