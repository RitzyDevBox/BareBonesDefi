import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { NumberInput } from "../Inputs/NumberInput";
import { IconButton } from "../Button/IconButton";
import { Modal } from "../Modal/Modal";
import { Sheet } from "../Primitives/Sheet";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationEarningsCodeView } from "../../utils/payroll/fetchPayrollViews";
import {
  formatEarningsCodeIdLabel,
  formatEarningsCodeName,
  isSystemEarningsCodeId,
} from "../../utils/payroll/earningsCodeDisplay";
import { EarningsDividerButton } from "./EarningsDividerButton";
import { RuleType } from "./ruleTypes";
import { Loader } from "../Loader/Loader";

const UINT32_MAX_NUM = 4294967295;

interface HourlyBandRow {
  maxHours: string;
  multiplier: string;
  isRemaining: boolean;
}

interface PayrollEarningsCatalogManagerProps {
  slug: string;
  canEdit: boolean;
  earningsCodes: OrganizationEarningsCodeView[];
  loading?: boolean;
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

export function PayrollEarningsCatalogManager({
  slug,
  canEdit,
  earningsCodes,
  loading = false,
}: PayrollEarningsCatalogManagerProps) {
  const screenSize = useMediaQuery({ phoneMax: 560 });
  const isPhone = screenSize === ScreenSize.Phone;
  const { chainId } = useWalletProvider();

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const payrollManagerInterface = useMemo(
    () => new ethers.utils.Interface(PayrollManagerABI as any),
    []
  );

  const [selectedCodeId, setSelectedCodeId] = useState<string>("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRuleType, setEditRuleType] = useState<RuleType>(RuleType.Custom);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [hourlyBands, setHourlyBands] = useState<HourlyBandRow[]>([
    { maxHours: "40", multiplier: "1", isRemaining: false },
    { maxHours: UINT32_MAX_NUM.toString(), multiplier: "1.5", isRemaining: true },
  ]);
  const [salaryPeriodDays, setSalaryPeriodDays] = useState("7");

  const earningsById = useMemo(
    () => new Map(earningsCodes.map((row) => [row.earningsCodeId.toString(), row] as const)),
    [earningsCodes]
  );

  const selectedCode = selectedCodeId ? earningsById.get(selectedCodeId) ?? null : null;
  const isSelectedSystemCode = Boolean(
    selectedCode && isSystemEarningsCodeId(selectedCode.earningsCodeId)
  );
  const canEditSelectedCode = Boolean(canEdit && !isSelectedSystemCode);

  const resolveRuleType = useCallback(
    (ruleAddress: string): RuleType => {
      if (!config) return RuleType.Custom;
      const normalized = (ruleAddress || "").toLowerCase();
      if (normalized === config.hoursRuleAddress.toLowerCase()) return RuleType.Hourly;
      if (normalized === config.weeklyScheduleRuleAddress.toLowerCase()) return RuleType.Weekly;
      if (normalized === config.salaryPerSecondRuleAddress.toLowerCase()) return RuleType.Salary;
      if (normalized === config.oneTimePaymentAddress.toLowerCase()) return RuleType.OneTime;
      return RuleType.Custom;
    },
    [config]
  );

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

        if (!isLast) {
          return normalizeRemainingBands(prev);
        }

        const next = prev.map((row, i) => {
          if (i !== index) {
            return { ...row, isRemaining: false };
          }

          if (checked) {
            return { ...row, isRemaining: true, maxHours: UINT32_MAX_NUM.toString() };
          }

          return { ...row, isRemaining: false, maxHours: UINT32_MAX_NUM.toString() };
        });

        return normalizeRemainingBands(next);
      }

      if (key === "maxHours") {
        return normalizeRemainingBands(
          prev.map((row, i) =>
            i === index ? { ...row, maxHours: value } : row
          )
        );
      }

      return normalizeRemainingBands(
        prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
      );
    });
  }

  function commitHourlyBandMaxHours(index: number) {
    setHourlyBands((prev) => {
      const minAllowed = minimumAllowedMaxHours(prev, index);
      const parsed = parseUint(prev[index]?.maxHours ?? "", minAllowed);
      const clamped = Math.max(minAllowed, Math.min(UINT32_MAX_NUM, parsed));

      const next = prev.map((row, i) =>
        i === index ? { ...row, maxHours: String(clamped) } : { ...row }
      );

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

  useEffect(() => {
    if (earningsCodes.length === 0 || (selectedCodeId && !earningsById.has(selectedCodeId))) {
      setSelectedCodeId("");
      setIsEditOpen(false);
    }
  }, [earningsCodes, selectedCodeId, earningsById]);

  useEffect(() => {
    if (!selectedCode) return;

    const ruleType = resolveRuleType(selectedCode.rule);
    setEditRuleType(ruleType);
    setIsActive(Boolean(selectedCode.isActive));

    if (ruleType === RuleType.Hourly) {
      try {
        const decoded = ethers.utils.defaultAbiCoder.decode(["uint32[]"], selectedCode.config || "0x");
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

        setHourlyBands(
          rows.length > 0
            ? normalizeRemainingBands(rows)
            : [
                { maxHours: "40", multiplier: "1", isRemaining: false },
                { maxHours: UINT32_MAX_NUM.toString(), multiplier: "1.5", isRemaining: true },
              ]
        );
      } catch {
        setHourlyBands([
          { maxHours: "40", multiplier: "1", isRemaining: false },
          { maxHours: UINT32_MAX_NUM.toString(), multiplier: "1.5", isRemaining: true },
        ]);
      }
      return;
    }

    if (ruleType === RuleType.Salary) {
      try {
        const decoded = ethers.utils.defaultAbiCoder.decode(["uint32"], selectedCode.config || "0x");
        setSalaryPeriodDays(ethers.BigNumber.from(decoded?.[0] ?? 7).toString());
      } catch {
        setSalaryPeriodDays("7");
      }
      return;
    }

    setHourlyBands([
      { maxHours: "40", multiplier: "1", isRemaining: false },
      { maxHours: UINT32_MAX_NUM.toString(), multiplier: "1.5", isRemaining: true },
    ]);
    setSalaryPeriodDays("7");
  }, [selectedCode, resolveRuleType]);

  const encodeSelectedConfig = useCallback(() => {
    if (!selectedCode) return "0x";

    if (editRuleType === RuleType.Hourly) {
      let priorCap = -1;
      const flattenedBands = hourlyBands.flatMap((row, idx) => {
        const fallbackCap = idx === hourlyBands.length - 1 ? UINT32_MAX_NUM : 40;
        const isRemainingBand = row.isRemaining && idx === hourlyBands.length - 1;
        let maxHours = isRemainingBand ? UINT32_MAX_NUM : parseUint(row.maxHours, fallbackCap);
        if (maxHours <= priorCap) {
          maxHours = Math.min(UINT32_MAX_NUM, priorCap + 1);
        }
        const multiplierBps = parseMultiplierToBps(row.multiplier, 10_000);
        priorCap = maxHours;
        return [maxHours, multiplierBps];
      });

      const bands = flattenedBands.length > 0 ? flattenedBands : [40, 10000];
      return ethers.utils.defaultAbiCoder.encode(["uint32[]"], [bands]);
    }

    if (editRuleType === RuleType.Salary) {
      const periodDays = parseUint(salaryPeriodDays, 7);
      return ethers.utils.defaultAbiCoder.encode(["uint32"], [periodDays]);
    }

    if (editRuleType === RuleType.OneTime) {
      return "0x";
    }

    return selectedCode.config || "0x";
  }, [selectedCode, editRuleType, hourlyBands, salaryPeriodDays]);

  const buildSetEarningsCodeTx = useCallback(
    (
      _: number,
      orgSlug: string,
      earningsCodeIdRaw: string,
      encodedConfig: string,
      nextIsActive: boolean
    ) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address missing");
      }

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
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
    [payrollManagerAddress, payrollManagerInterface]
  );

  const setEarningsCode = useExecuteRawTx(
    buildSetEarningsCodeTx,
    (_: number, orgSlug: string, earningsCodeIdRaw: string, __: string, nextIsActive: boolean) =>
      `${nextIsActive ? "Updated" : "Deactivated"} earnings code ${earningsCodeIdRaw} for ${orgSlug}`
  );

  async function submitUpdate(nextIsActive: boolean) {
    if (!chainId || !slug || !selectedCodeId || isSelectedSystemCode || isSubmittingUpdate) return;
    setIsSubmittingUpdate(true);
    try {
      await setEarningsCode(chainId, slug, selectedCodeId, encodeSelectedConfig(), nextIsActive);
      setIsEditOpen(false);
    } finally {
      setIsSubmittingUpdate(false);
    }
  }

  function openEditModal(codeId: string) {
    setSelectedCodeId(codeId);
    setIsEditOpen(true);
  }

  const userCodes = useMemo(
    () => earningsCodes.filter((row) => !isSystemEarningsCodeId(row.earningsCodeId)),
    [earningsCodes]
  );

  const systemCodes = useMemo(
    () => earningsCodes.filter((row) => isSystemEarningsCodeId(row.earningsCodeId)),
    [earningsCodes]
  );

  function renderEmbeddedCardLabel(label: string) {
    return (
      <Text.Label
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "var(--colors-surface)",
          padding: "0 var(--spacing-sm)",
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        {label}
      </Text.Label>
    );
  }

  const editContent = selectedCode && !isSelectedSystemCode ? (
    <Stack gap="sm">
      <Text.Body size="sm" color="warn">
        Warning: updating this earnings code will apply to all payees currently using this code.
      </Text.Body>

      {editRuleType === RuleType.Hourly && (
        <Stack
          gap="xs"
          style={{
            border: "1px solid var(--colors-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--spacing-sm)",
          }}
        >
          {hourlyBands.map((band, index) => (
            <Row
              key={`manage-hourly-band-${index}`}
              gap="sm"
              wrap
              align="end"
              style={{
                position: "relative",
                paddingBottom: "var(--spacing-xs)",
                paddingRight: "34px",
                borderBottom:
                  index === hourlyBands.length - 1
                    ? "none"
                    : "1px dashed var(--colors-border)",
              }}
            >
              <button
                aria-label="Delete band"
                type="button"
                disabled={!canEditSelectedCode || hourlyBands.length <= 1}
                onClick={() => removeHourlyBand(index)}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  border: "1px solid var(--colors-border)",
                  background: "var(--colors-background)",
                  color: "var(--colors-text)",
                  cursor: !canEditSelectedCode || hourlyBands.length <= 1 ? "not-allowed" : "pointer",
                  lineHeight: 1,
                  fontSize: 20,
                  fontWeight: 500,
                }}
              >
                ×
              </button>

              <Stack style={{ flex: 1, minWidth: 140 }}>
                <Text.Body size="sm" color="muted">Multiplier</Text.Body>
                <NumberInput
                  value={band.multiplier}
                  onChange={(e) => updateHourlyBand(index, "multiplier", (e.target as HTMLInputElement).value)}
                  allowDecimal
                  disabled={!canEditSelectedCode}
                />
              </Stack>

              {!band.isRemaining && (
                <Stack style={{ flex: 1, minWidth: 130 }}>
                  <Text.Body size="sm" color="muted">Max Hours</Text.Body>
                  <NumberInput
                    value={band.maxHours}
                    onChange={(e) => updateHourlyBand(index, "maxHours", (e.target as HTMLInputElement).value)}
                    onBlur={() => commitHourlyBandMaxHours(index)}
                    allowDecimal={false}
                    disabled={!canEditSelectedCode}
                  />
                </Stack>
              )}

              <Stack style={{ minWidth: 160, paddingBottom: "var(--spacing-xs)" }}>
                {index === hourlyBands.length - 1 ? (
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
                    <input
                      type="checkbox"
                      checked={band.isRemaining}
                      disabled={!canEditSelectedCode}
                      onChange={(e) => updateHourlyBand(index, "isRemaining", String(e.target.checked))}
                    />
                    <Text.Body size="sm">Remaining Hours</Text.Body>
                  </label>
                ) : (
                  <Text.Body size="sm" color="muted">Bounded Band</Text.Body>
                )}
              </Stack>
            </Row>
          ))}

          <EarningsDividerButton
            label="+ Add Band"
            onClick={addHourlyBand}
            disabled={!canEditSelectedCode}
          />
        </Stack>
      )}

      {editRuleType === RuleType.Salary && (
        <Stack style={{ maxWidth: 260 }}>
          <Text.Body size="sm" color="muted">Salary Period (days)</Text.Body>
          <NumberInput
            value={salaryPeriodDays}
            onChange={(e) => setSalaryPeriodDays((e.target as HTMLInputElement).value)}
            allowDecimal={false}
            disabled={!canEditSelectedCode}
          />
        </Stack>
      )}

      {editRuleType === RuleType.OneTime && (
        <Text.Body size="sm" color="muted">
          One-Time rule uses empty config.
        </Text.Body>
      )}

      <Row gap="sm" justify="end" wrap>
        <ButtonSecondary
          style={{ flex: 0, minWidth: 124 }}
          disabled={!canEditSelectedCode || isSubmittingUpdate}
          onClick={() => submitUpdate(!isActive)}
        >
          {isSubmittingUpdate ? <Loader inline size={14} color="currentColor" /> : null}
          {isActive ? "Deactivate" : "Activate"}
        </ButtonSecondary>
        <ButtonPrimary
          style={{ flex: 0, minWidth: 104 }}
          disabled={!canEditSelectedCode || isSubmittingUpdate}
          onClick={() => submitUpdate(isActive)}
        >
          {isSubmittingUpdate ? <Loader inline size={14} color="currentColor" /> : null}
          Save
        </ButtonPrimary>
      </Row>
    </Stack>
  ) : null;

  if (earningsCodes.length === 0) {
    return (
      <Stack
        gap="sm"
        style={{
          position: "relative",
          border: "1px solid var(--colors-border)",
          borderRadius: "var(--radius-md)",
          padding: "var(--spacing-md)",
          paddingTop: "calc(var(--spacing-md) + 2px)",
          backgroundColor: "var(--colors-surface)",
        }}
      >
        {renderEmbeddedCardLabel("Manage Earnings Codes")}
        {loading ? (
          <Loader kind="table" label="Loading earnings codes..." />
        ) : (
          <Text.Body size="sm" color="muted">
            No earnings codes found. Register a code first.
          </Text.Body>
        )}
      </Stack>
    );
  }

  return (
    <Stack
      gap="sm"
      style={{
        position: "relative",
        border: "1px solid var(--colors-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-md)",
        paddingTop: "calc(var(--spacing-md) + 2px)",
        backgroundColor: "var(--colors-surface)",
      }}
    >
      {renderEmbeddedCardLabel("Manage Earnings Codes")}

      <Stack gap="xs">
        <Text.Body size="sm" color="muted">User Earnings Codes</Text.Body>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: "var(--spacing-sm)",
          }}
        >
          {userCodes.map((code) => {
            const id = code.earningsCodeId.toString();
            const displayId = formatEarningsCodeIdLabel(code.earningsCodeId);
            const displayName = formatEarningsCodeName(code.name);
            const type = resolveRuleType(code.rule);
            const typeLabel =
              type === RuleType.Hourly
                ? "Hourly"
                : type === RuleType.Weekly
                ? "Weekly"
                : type === RuleType.Salary
                ? "Salary"
                : type === RuleType.OneTime
                ? "One-Time"
                : "Custom";

            return (
              <div
                key={id}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--colors-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--spacing-sm)",
                  background: "var(--colors-surface)",
                }}
              >
                <Row justify="between" align="start" style={{ width: "100%" }}>
                  <Stack gap="xs" style={{ minWidth: 0 }}>
                    <Text.Body weight={600}>
                      {displayName}{" "}
                      <span
                        style={{
                          color: "var(--colors-text-muted)",
                          fontSize: "0.85em",
                          fontWeight: 500,
                        }}
                      >
                        ({displayId})
                      </span>
                    </Text.Body>
                    <Text.Body size="sm" color="muted">{typeLabel}</Text.Body>
                    <Text.Body size="sm" color={code.isActive ? "success" : "warn"}>
                      {code.isActive ? "Active" : "Inactive"}
                    </Text.Body>
                  </Stack>
                  <IconButton
                    size="lg"
                    iconFontSize="lg"
                    shape="square"
                    aria-label={`Edit ${displayName}`}
                    onClick={() => openEditModal(id)}
                    disabled={!canEdit}
                    style={{ marginLeft: "var(--spacing-sm)", borderRadius: "var(--radius-sm)" }}
                  >
                    ✎
                  </IconButton>
                </Row>
              </div>
            );
          })}
        </div>
      </Stack>

      {systemCodes.length > 0 && (
        <Stack gap="xs">
          <Text.Body size="sm" color="muted">System Earnings Codes</Text.Body>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: "var(--spacing-sm)",
            }}
          >
            {systemCodes.map((code) => {
              const displayId = formatEarningsCodeIdLabel(code.earningsCodeId);
              const displayName = formatEarningsCodeName(code.name);
              const type = resolveRuleType(code.rule);
              const typeLabel =
                type === RuleType.Hourly
                  ? "Hourly"
                  : type === RuleType.Weekly
                  ? "Weekly"
                  : type === RuleType.Salary
                  ? "Salary"
                  : type === RuleType.OneTime
                  ? "One-Time"
                  : "Custom";

              return (
                <div
                  key={code.earningsCodeId.toString()}
                  style={{
                    textAlign: "left",
                    border: "1px solid var(--colors-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--spacing-sm)",
                    background: "var(--colors-surface)",
                  }}
                >
                  <Stack gap="xs" style={{ minWidth: 0 }}>
                    <Text.Body weight={600}>
                      {displayName}{" "}
                      <span
                        style={{
                          color: "var(--colors-text-muted)",
                          fontSize: "0.85em",
                          fontWeight: 500,
                        }}
                      >
                        ({displayId})
                      </span>
                    </Text.Body>
                    <Text.Body size="sm" color="muted">{typeLabel}</Text.Body>
                    <Text.Body size="sm" color="muted">System</Text.Body>
                    <Text.Body size="sm" color={code.isActive ? "success" : "warn"}>
                      {code.isActive ? "Active" : "Inactive"}
                    </Text.Body>
                  </Stack>
                </div>
              );
            })}
          </div>
        </Stack>
      )}

      {selectedCode && !isSelectedSystemCode && isPhone && (
        <Sheet open={isEditOpen} onClose={() => setIsEditOpen(false)} placement="bottom">
          <Text.Label>Edit Earnings Code</Text.Label>
          <div style={{ height: 8 }} />
          {editContent}
        </Sheet>
      )}

      {selectedCode && !isSelectedSystemCode && !isPhone && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Earnings Code"
          width={760}
          maxWidth={"96vw"}
        >
          {editContent}
        </Modal>
      )}
    </Stack>
  );
}
