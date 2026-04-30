import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { Modal } from "../Modal/Modal";
import { Sheet } from "../Primitives/Sheet";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationEarningsCodeView } from "../../utils/payroll/fetchPayrollViews";
import {
  formatEarningsCodeIdLabel,
  formatEarningsCodeName,
} from "../../utils/payroll/earningsCodeDisplay";
import { Loader } from "../Loader/Loader";
import {
  WeeklyScheduleConfigurator,
  type WeeklyPremiumMaskDraft,
  createDefaultWeeklyPremiumRows,
  WEEK_HOURS,
} from "./WeeklyScheduleConfigurator";
import { RuleType } from "./ruleTypes";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import { orgSlugFor } from "../../utils/payroll/orgSlug";

const UINT32_MAX_NUM = 4294967295;

function NumberFieldInput(props: {
  value: string;
  onChange: (next: string) => void;
  allowDecimal?: boolean;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { value, onChange, allowDecimal = true, onBlur, disabled, placeholder } = props;
  const re = useMemo(() => new RegExp(`^\\d*${allowDecimal ? "(\\.\\d*)?" : ""}$`), [allowDecimal]);
  return (
    <input
      type="text"
      className="bb-input bb-mono"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={allowDecimal ? "decimal" : "numeric"}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "" || re.test(next)) onChange(next);
      }}
      onBlur={onBlur}
    />
  );
}

interface HourlyBandRow {
  maxHours: string;
  multiplier: string;
  isRemaining: boolean;
}

const RULE_KIND_OPTIONS: Array<{ id: RuleType; label: string; sub: string }> = [
  { id: RuleType.Hourly, label: "Hourly", sub: "rate × bands" },
  { id: RuleType.Weekly, label: "Weekly", sub: "schedule grid" },
  { id: RuleType.OneTime, label: "One-Time", sub: "fixed payout" },
  { id: RuleType.Salary, label: "Salary", sub: "per-period" },
];

function ruleKindLabel(rt: RuleType): string {
  switch (rt) {
    case RuleType.Hourly:
      return "Hourly";
    case RuleType.Weekly:
      return "Weekly";
    case RuleType.OneTime:
      return "One-Time";
    case RuleType.Salary:
      return "Salary";
    default:
      return "Custom";
  }
}

function ruleKindClass(rt: RuleType): string {
  switch (rt) {
    case RuleType.Hourly:
      return "bb-ec-rule-hourly";
    case RuleType.Weekly:
      return "bb-ec-rule-weekly";
    case RuleType.OneTime:
      return "bb-ec-rule-oneTime";
    case RuleType.Salary:
      return "bb-ec-rule-salary";
    default:
      return "";
  }
}

function parseUint(value: string, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function parseMultiplierToBps(value: string, fallback = 10_000) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.max(0, Math.floor(n * 10_000));
}

function formatBpsToMultiplier(bpsRaw: ethers.BigNumberish) {
  const bps = Number(ethers.BigNumber.from(bpsRaw).toString());
  return (bps / 10_000).toFixed(4).replace(/\.?0+$/, "") || "1";
}

function defaultHourlyBands(): HourlyBandRow[] {
  return [
    { maxHours: "40", multiplier: "1", isRemaining: false },
    { maxHours: UINT32_MAX_NUM.toString(), multiplier: "1.5", isRemaining: true },
  ];
}

function defaultWeeklyRows(): WeeklyPremiumMaskDraft[] {
  return createDefaultWeeklyPremiumRows();
}

interface PayrollEarningsManagerProps {
  slug: string;
  canEdit: boolean;
  isOpen: boolean;
  onClose: () => void;
  mode: "register" | "edit";
  target?: OrganizationEarningsCodeView | null;
  onSubmitted?: () => void;
}

export function PayrollEarningsManager({
  slug,
  canEdit,
  isOpen,
  onClose,
  mode,
  target,
  onSubmitted,
}: PayrollEarningsManagerProps) {
  const { chainId } = useWalletProvider();
  const screenSize = useMediaQuery({ phoneMax: 560 });
  const isPhone = screenSize === ScreenSize.Phone;

  const config = useMemo(() => (chainId ? getBareBonesConfiguration(chainId) : null), [chainId]);
  const payrollManagerAddress = config?.payrollManagerAddress;
  const payrollManagerInterface = useMemo(
    () => new ethers.utils.Interface(PayrollManagerABI as any),
    [],
  );

  const resolveRuleType = useCallback(
    (ruleAddress: string): RuleType => {
      if (!config) return RuleType.Custom;
      const a = (ruleAddress || "").toLowerCase();
      if (a === config.hoursRuleAddress.toLowerCase()) return RuleType.Hourly;
      if (a === config.weeklyScheduleRuleAddress.toLowerCase()) return RuleType.Weekly;
      if (a === config.salaryPerSecondRuleAddress.toLowerCase()) return RuleType.Salary;
      if (a === config.oneTimePaymentAddress.toLowerCase()) return RuleType.OneTime;
      return RuleType.Custom;
    },
    [config],
  );

  const [ruleType, setRuleType] = useState<RuleType>(RuleType.Hourly);
  const [earningsCodeName, setEarningsCodeName] = useState("");
  const [hourlyBands, setHourlyBands] = useState<HourlyBandRow[]>(defaultHourlyBands);
  const [weeklyPremiumRows, setWeeklyPremiumRows] = useState<WeeklyPremiumMaskDraft[]>(defaultWeeklyRows);
  const [salaryPeriodDays, setSalaryPeriodDays] = useState("7");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editingTarget = mode === "edit" ? target ?? null : null;
  const editingRuleType = editingTarget ? resolveRuleType(editingTarget.rule) : null;
  const isCustomEditing = editingRuleType === RuleType.Custom;

  // Reset / pre-populate when the modal opens or mode/target changes
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "register") {
      setRuleType(RuleType.Hourly);
      setEarningsCodeName("");
      setHourlyBands(defaultHourlyBands());
      setWeeklyPremiumRows(defaultWeeklyRows());
      setSalaryPeriodDays("7");
      setIsActive(true);
      return;
    }

    if (!editingTarget) return;

    const rt = resolveRuleType(editingTarget.rule);
    setRuleType(rt);
    setEarningsCodeName(formatEarningsCodeName(editingTarget.name));
    setIsActive(Boolean(editingTarget.isActive));

    if (rt === RuleType.Hourly) {
      try {
        const decoded = ethers.utils.defaultAbiCoder.decode(["uint32[]"], editingTarget.config || "0x");
        const flat = (decoded?.[0] ?? []) as ethers.BigNumberish[];
        const rows: HourlyBandRow[] = [];
        for (let i = 0; i + 1 < flat.length; i += 2) {
          const maxHours = ethers.BigNumber.from(flat[i]).toString();
          const multiplier = formatBpsToMultiplier(flat[i + 1]);
          rows.push({
            maxHours,
            multiplier,
            isRemaining: maxHours === UINT32_MAX_NUM.toString() && i + 2 >= flat.length,
          });
        }
        setHourlyBands(rows.length > 0 ? rows : defaultHourlyBands());
      } catch {
        setHourlyBands(defaultHourlyBands());
      }
      setWeeklyPremiumRows(defaultWeeklyRows());
      setSalaryPeriodDays("7");
      return;
    }

    if (rt === RuleType.Salary) {
      try {
        const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], editingTarget.config || "0x");
        setSalaryPeriodDays(ethers.BigNumber.from(decoded?.[0] ?? 7).toString());
      } catch {
        setSalaryPeriodDays("7");
      }
      setHourlyBands(defaultHourlyBands());
      setWeeklyPremiumRows(defaultWeeklyRows());
      return;
    }

    // Weekly / OneTime / Custom: keep defaults (we don't decode weekly here yet)
    setHourlyBands(defaultHourlyBands());
    setWeeklyPremiumRows(defaultWeeklyRows());
    setSalaryPeriodDays("7");
  }, [isOpen, mode, editingTarget, resolveRuleType]);

  // ---- Hourly band helpers (preserved from prior implementation) ----
  function normalizeRemainingBands(rows: HourlyBandRow[]) {
    return rows.map((row, i) => ({
      ...row,
      isRemaining: row.isRemaining && i === rows.length - 1,
    }));
  }
  function minimumAllowedMaxHours(rows: HourlyBandRow[], index: number) {
    if (index <= 0) return 0;
    const prior = parseUint(rows[index - 1].maxHours, 0);
    return Math.min(UINT32_MAX_NUM, prior + 1);
  }
  function updateHourlyBand(index: number, key: keyof HourlyBandRow, value: string) {
    setHourlyBands((prev) => {
      if (key === "isRemaining") {
        const checked = value === "true";
        const isLast = index === prev.length - 1;
        if (!isLast) return normalizeRemainingBands(prev);
        const next = prev.map((row, i) => {
          if (i !== index) return { ...row, isRemaining: false };
          return checked
            ? { ...row, isRemaining: true, maxHours: UINT32_MAX_NUM.toString() }
            : { ...row, isRemaining: false, maxHours: UINT32_MAX_NUM.toString() };
        });
        return normalizeRemainingBands(next);
      }
      if (key === "maxHours") {
        return normalizeRemainingBands(
          prev.map((row, i) => (i === index ? { ...row, maxHours: value } : row)),
        );
      }
      return normalizeRemainingBands(
        prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
      );
    });
  }
  function commitHourlyBandMaxHours(index: number) {
    setHourlyBands((prev) => {
      const minAllowed = minimumAllowedMaxHours(prev, index);
      const parsed = parseUint(prev[index]?.maxHours ?? "", minAllowed);
      const clamped = Math.max(minAllowed, Math.min(UINT32_MAX_NUM, parsed));
      const next = prev.map((row, i) => (i === index ? { ...row, maxHours: String(clamped) } : { ...row }));
      for (let i = index + 1; i < next.length; i += 1) {
        if (next[i].isRemaining) {
          next[i].maxHours = UINT32_MAX_NUM.toString();
          continue;
        }
        const prior = parseUint(next[i - 1].maxHours, 0);
        const current = parseUint(next[i].maxHours, prior + 1);
        if (current <= prior) {
          next[i].maxHours = String(Math.min(UINT32_MAX_NUM, prior + 1));
        }
      }
      return normalizeRemainingBands(next);
    });
  }
  function addHourlyBand() {
    setHourlyBands((prev) => {
      const next = prev.map((row) => ({ ...row, isRemaining: false }));
      return [...next, { maxHours: UINT32_MAX_NUM.toString(), multiplier: "1", isRemaining: true }];
    });
  }
  function removeHourlyBand(index: number) {
    setHourlyBands((prev) => {
      if (prev.length <= 1) return prev;
      return normalizeRemainingBands(prev.filter((_, i) => i !== index));
    });
  }

  function encodeRuleConfig(rt: RuleType): string {
    if (rt === RuleType.Hourly) {
      let priorCap = -1;
      const flattenedBands = hourlyBands.flatMap((row, idx) => {
        const fallbackCap = idx === hourlyBands.length - 1 ? UINT32_MAX_NUM : 40;
        const isRemainingBand = row.isRemaining && idx === hourlyBands.length - 1;
        let maxHours = isRemainingBand ? UINT32_MAX_NUM : parseUint(row.maxHours, fallbackCap);
        if (maxHours <= priorCap) maxHours = Math.min(UINT32_MAX_NUM, priorCap + 1);
        const multiplierBps = parseMultiplierToBps(row.multiplier, 10_000);
        priorCap = maxHours;
        return [maxHours, multiplierBps];
      });
      const bands = flattenedBands.length > 0 ? flattenedBands : [40, 10000];
      return ethers.utils.defaultAbiCoder.encode(["uint32[]"], [bands]);
    }
    if (rt === RuleType.Weekly) {
      const normalized = weeklyPremiumRows
        .map((row) => {
          let mask = 0n;
          for (let i = 0; i < WEEK_HOURS; i += 1) {
            if (row.mask[i]) mask |= 1n << BigInt(i);
          }
          const multiplier = Number(row.multiplier);
          const bips = Number.isFinite(multiplier) ? Math.max(0, Math.floor(multiplier * 10_000)) : 0;
          return { mask, bips };
        })
        .filter((row) => row.mask > 0n && row.bips > 0);
      const premiumMasks = normalized.map((row) => row.mask.toString());
      const premiumBips = normalized.map((row) => row.bips.toString());
      return ethers.utils.defaultAbiCoder.encode(["uint168[]", "uint16[]"], [premiumMasks, premiumBips]);
    }
    if (rt === RuleType.Salary) {
      const periodDays = parseUint(salaryPeriodDays, 7);
      return ethers.utils.defaultAbiCoder.encode(["uint32"], [periodDays]);
    }
    if (rt === RuleType.OneTime) {
      return "0x";
    }
    // Custom — preserve target's existing config when editing
    return editingTarget?.config || "0x";
  }

  // ---- TX builders ----
  const registerTx = useExecuteRawTx(
    (_: number, orgSlug: string) => {
      if (!payrollManagerAddress || !config) throw new Error("Payroll manager config missing");
      const slugBytes = orgSlugFor(orgSlug);
      const codeName = earningsCodeName.trim().toUpperCase();
      if (!codeName) throw new Error("Earnings code name is required");
      const codeNameBytes = ethers.utils.formatBytes32String(codeName);
      const ruleAddress =
        ruleType === RuleType.Hourly
          ? config.hoursRuleAddress
          : ruleType === RuleType.Weekly
            ? config.weeklyScheduleRuleAddress
            : ruleType === RuleType.OneTime
              ? config.oneTimePaymentAddress
              : config.salaryPerSecondRuleAddress;
      const encodedConfig = encodeRuleConfig(ruleType);
      return {
        to: payrollManagerAddress,
        data: payrollManagerInterface.encodeFunctionData("registerEarningsCode", [
          slugBytes,
          codeNameBytes,
          ruleAddress,
          encodedConfig,
        ]),
      } as any;
    },
    (_: number, orgSlug: string) => `Registered ${ruleType} earnings code for ${orgSlug}`,
  );

  const setEarningsCodeTx = useExecuteRawTx(
    (
      _: number,
      orgSlug: string,
      earningsCodeIdRaw: string,
      encodedConfig: string,
      nextIsActive: boolean,
    ) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = orgSlugFor(orgSlug);
      return {
        to: payrollManagerAddress,
        data: payrollManagerInterface.encodeFunctionData("setEarningsCode", [
          slugBytes,
          ethers.BigNumber.from(earningsCodeIdRaw),
          encodedConfig,
          nextIsActive,
        ]),
      } as any;
    },
    (_: number, orgSlug: string, earningsCodeIdRaw: string, __: string, nextIsActive: boolean) =>
      `${nextIsActive ? "Updated" : "Deactivated"} earnings code ${earningsCodeIdRaw} for ${orgSlug}`,
  );

  const canRegister = Boolean(canEdit && slug && payrollManagerAddress && mode === "register");
  const canSaveEdit = Boolean(canEdit && slug && payrollManagerAddress && mode === "edit" && editingTarget);

  async function handleRegister() {
    if (!chainId || !canRegister || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await registerTx(chainId, slug);
      onSubmitted?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(nextIsActive: boolean) {
    if (!chainId || !canSaveEdit || !editingTarget || isSubmitting || isCustomEditing) return;
    setIsSubmitting(true);
    try {
      await setEarningsCodeTx(
        chainId,
        slug,
        editingTarget.earningsCodeId.toString(),
        encodeRuleConfig(ruleType),
        nextIsActive,
      );
      onSubmitted?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---- Form body ----
  const formBody = (
    <div className="bb-field-grid" style={{ gap: 16 }}>
      {mode === "edit" && editingTarget && (
        <div
          className="bb-field bb-full"
          style={{
            background: "color-mix(in oklab, var(--bb-warn) 8%, var(--bb-bg-elev-2))",
            border: "1px solid color-mix(in oklab, var(--bb-warn) 30%, var(--bb-line))",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <Text.Body size="sm">
            Updating this earnings code will apply to all payees currently using it.
          </Text.Body>
        </div>
      )}

      {mode === "register" ? (
        <div className="bb-field bb-full">
          <label>Rule Kind</label>
          {isPhone ? (
            <select
              className="bb-input"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as RuleType)}
              disabled={!canEdit}
            >
              {RULE_KIND_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.sub}
                </option>
              ))}
            </select>
          ) : (
            <div className="bb-seg" role="tablist" aria-label="Rule kind">
              {RULE_KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={ruleType === opt.id}
                  className={`bb-seg-btn${ruleType === opt.id ? " bb-active" : ""}`}
                  onClick={() => setRuleType(opt.id)}
                  disabled={!canEdit}
                >
                  <span className="bb-seg-btn-label">{opt.label}</span>
                  <span className="bb-seg-btn-sub">{opt.sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : editingTarget ? (
        <div className="bb-field">
          <label>Rule Kind</label>
          <Row gap="sm" align="center" style={{ flexWrap: "wrap" }}>
            <span className={`bb-ec-card-rule ${ruleKindClass(ruleType)}`}>
              {ruleKindLabel(ruleType)}
            </span>
            <Text.Body size="sm" color="muted" style={{ fontFamily: "var(--bb-font-mono)" }}>
              {formatEarningsCodeIdLabel(editingTarget.earningsCodeId)}
            </Text.Body>
          </Row>
        </div>
      ) : null}

      <div className={mode === "register" ? "bb-field" : "bb-field bb-full"}>
        <label>Earnings Code Name</label>
        {mode === "register" ? (
          <input
            className="bb-input bb-mono"
            value={earningsCodeName}
            onChange={(e) => setEarningsCodeName(e.target.value)}
            placeholder="e.g. HOURLY_OT"
            disabled={!canEdit}
          />
        ) : (
          <Text.Body style={{ fontFamily: "var(--bb-font-mono)", fontSize: 14 }}>
            {earningsCodeName || "—"}
          </Text.Body>
        )}
      </div>

      {ruleType === RuleType.Hourly && (
        <div className="bb-field bb-full">
          <div className="bb-ec-bands">
            <div className="bb-ec-bands-head">
              <span className="bb-ec-bands-title">Tiered bands</span>
              <button
                type="button"
                className="bb-btn-ghost bb-btn-xs"
                onClick={addHourlyBand}
                disabled={!canEdit || isCustomEditing}
              >
                + Add tier
              </button>
            </div>

            {hourlyBands.map((band, index) => {
              const startHours =
                index === 0 ? 0 : parseUint(hourlyBands[index - 1]?.maxHours ?? "0", 0);
              const isLast = index === hourlyBands.length - 1;
              const isRemainingBand = band.isRemaining && isLast;
              const maxHours = parseUint(band.maxHours, 40);
              const descriptor = isRemainingBand
                ? `All remaining hours after ${startHours} paid at rate × ${band.multiplier}.`
                : `${startHours} – ${maxHours} hrs paid at rate × ${band.multiplier}.`;
              const canRemove = !isCustomEditing && canEdit && hourlyBands.length > 1;

              return (
                <div key={`hourly-band-${index}`} className="bb-ec-band">
                  <span className="bb-ec-band-i">#{index + 1}</span>

                  <div className="bb-field">
                    <label>Up to (hrs)</label>
                    {band.isRemaining ? (
                      <input className="bb-input bb-mono" disabled value="∞" />
                    ) : (
                      <NumberFieldInput
                        value={band.maxHours}
                        onChange={(v) => updateHourlyBand(index, "maxHours", v)}
                        onBlur={() => commitHourlyBandMaxHours(index)}
                        allowDecimal={false}
                        disabled={!canEdit || isCustomEditing}
                      />
                    )}
                  </div>

                  <div className="bb-field">
                    <label>Multiplier</label>
                    <NumberFieldInput
                      value={band.multiplier}
                      onChange={(v) => updateHourlyBand(index, "multiplier", v)}
                      allowDecimal
                      disabled={!canEdit || isCustomEditing}
                    />
                  </div>

                  {canRemove ? (
                    <button
                      type="button"
                      className="bb-icon-btn-sm bb-danger"
                      onClick={() => removeHourlyBand(index)}
                      title="Remove tier"
                      aria-label="Remove tier"
                      style={{ marginBottom: 8 }}
                    >
                      ✕
                    </button>
                  ) : (
                    <span aria-hidden style={{ width: 32 }} />
                  )}

                  {isLast && (
                    <div
                      style={{ gridColumn: "2 / -1", display: "flex", flexDirection: "column", gap: 6 }}
                    >
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          color: "var(--bb-text-dim)",
                          fontFamily: "inherit",
                          letterSpacing: 0,
                          textTransform: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={band.isRemaining}
                          disabled={!canEdit || isCustomEditing}
                          onChange={(e) =>
                            updateHourlyBand(index, "isRemaining", String(e.target.checked))
                          }
                        />
                        Treat last tier as remaining hours (∞)
                      </label>
                      <div
                        className="bb-field-hint"
                        style={{ textTransform: "none", letterSpacing: 0 }}
                      >
                        {descriptor}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ruleType === RuleType.Weekly && (
        <div className="bb-field bb-full">
          <WeeklyScheduleConfigurator
            canEdit={canEdit && !isCustomEditing}
            premiumRows={weeklyPremiumRows}
            onPremiumRowsChange={setWeeklyPremiumRows}
          />
        </div>
      )}

      {ruleType === RuleType.OneTime && (
        <div className="bb-field bb-full">
          <div className="bb-ec-onetime">
            <span className="bb-ec-onetime-icon" aria-hidden>•</span>
            <div className="bb-ec-onetime-body">
              <b>No configuration.</b>
              <span className="bb-muted bb-small">
                One-time earnings are configured per-payee at the time of payout (raw amount).
              </span>
            </div>
          </div>
        </div>
      )}

      {ruleType === RuleType.Salary && (
        <div className="bb-field">
          <label>Salary Period (days)</label>
          <NumberFieldInput
            value={salaryPeriodDays}
            onChange={(v) => setSalaryPeriodDays(v)}
            allowDecimal={false}
            disabled={!canEdit || isCustomEditing}
          />
          <div className="bb-field-hint">Encoded as uint32 days per cycle.</div>
        </div>
      )}

      {isCustomEditing && (
        <div className="bb-field bb-full">
          <Text.Body size="sm" color="muted">
            This code uses a custom rule address. Editing custom configs is not supported here —
            only the active/inactive flag can be changed.
          </Text.Body>
        </div>
      )}
    </div>
  );

  const footer =
    mode === "register" ? (
      <Row gap="sm" justify="end" style={{ marginTop: 18 }}>
        <ButtonSecondary style={{ flex: 0, minWidth: 120 }} onClick={onClose} disabled={isSubmitting}>
          Cancel
        </ButtonSecondary>
        <ButtonPrimary
          style={{ flex: 0, minWidth: 132 }}
          disabled={!canRegister || isSubmitting || !earningsCodeName.trim()}
          onClick={handleRegister}
        >
          {isSubmitting ? <Loader inline size={14} color="currentColor" /> : null}
          Register
        </ButtonPrimary>
      </Row>
    ) : (
      <Row gap="sm" justify="end" wrap style={{ marginTop: 18 }}>
        <ButtonSecondary style={{ flex: 0, minWidth: 120 }} onClick={onClose} disabled={isSubmitting}>
          Cancel
        </ButtonSecondary>
        <ButtonSecondary
          style={{ flex: 0, minWidth: 132 }}
          disabled={!canSaveEdit || isSubmitting}
          onClick={() => handleEdit(!isActive)}
        >
          {isSubmitting ? <Loader inline size={14} color="currentColor" /> : null}
          {isActive ? "Deactivate" : "Activate"}
        </ButtonSecondary>
        <ButtonPrimary
          style={{ flex: 0, minWidth: 120 }}
          disabled={!canSaveEdit || isSubmitting || isCustomEditing}
          onClick={() => handleEdit(isActive)}
        >
          {isSubmitting ? <Loader inline size={14} color="currentColor" /> : null}
          Save
        </ButtonPrimary>
      </Row>
    );

  const title = mode === "register" ? "Register Earnings Code" : "Edit Earnings Code";

  if (isPhone) {
    return (
      <Sheet open={isOpen} onClose={onClose} placement="bottom">
        <Text.Label>{title}</Text.Label>
        <div style={{ height: 8 }} />
        {formBody}
        {footer}
      </Sheet>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={760} maxWidth={"96vw"}>
      {formBody}
      {footer}
    </Modal>
  );
}
