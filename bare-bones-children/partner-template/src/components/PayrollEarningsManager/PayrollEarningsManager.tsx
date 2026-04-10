import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { Input } from "../BasicComponents";
import { NumberInput } from "../Inputs/NumberInput";
import { Select, SelectOption } from "../Select";
import { Modal } from "../Modal/Modal";
import { Sheet } from "../Primitives/Sheet";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationEarningsCodeView } from "../../utils/payroll/fetchPayrollViews";
import { PayrollEarningsCatalogManager } from "./PayrollEarningsCatalogManager";
import { EarningsDividerButton } from "./EarningsDividerButton";
import { Loader } from "../Loader/Loader";
import {
  WeeklyScheduleConfigurator,
  type WeeklyPremiumMaskDraft,
  createDefaultWeeklyPremiumRows,
  WEEK_HOURS,
} from "./WeeklyScheduleConfigurator";
import { RuleType } from "./ruleTypes";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

const UINT32_MAX_NUM = 4294967295;

interface HourlyBandRow {
  maxHours: string;
  multiplier: string;
  isRemaining: boolean;
}

interface PayrollEarningsManagerProps {
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

export function PayrollEarningsManager({
  slug,
  canEdit,
  earningsCodes,
  loading = false,
}: PayrollEarningsManagerProps) {
  const { chainId } = useWalletProvider();
  const screenSize = useMediaQuery({ phoneMax: 560 });
  const isPhone = screenSize === ScreenSize.Phone;

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const payrollManagerInterface = useMemo(
    () => new ethers.utils.Interface(PayrollManagerABI as any),
    []
  );

  const [ruleType, setRuleType] = useState<RuleType>(RuleType.Hourly);
  const [earningsCodeName, setEarningsCodeName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hourlyBands, setHourlyBands] = useState<HourlyBandRow[]>([
    { maxHours: "40", multiplier: "1", isRemaining: false },
    { maxHours: UINT32_MAX_NUM.toString(), multiplier: "1.5", isRemaining: true },
  ]);
  const [weeklyPremiumRows, setWeeklyPremiumRows] = useState<WeeklyPremiumMaskDraft[]>(
    createDefaultWeeklyPremiumRows()
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
        // Let users type freely (including temporary empty value).
        // Final validation/clamping is applied on blur.
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

      // Cascade constraints to following bands.
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

  function handleRuleTypeChange(next: RuleType) {
    setRuleType(next);
    setEarningsCodeName("");

    if (next === RuleType.Hourly) {
      setHourlyBands([
        { maxHours: "40", multiplier: "1", isRemaining: false },
        { maxHours: UINT32_MAX_NUM.toString(), multiplier: "1.5", isRemaining: true },
      ]);
    } else {
      setHourlyBands([]);
    }

    if (next === RuleType.Weekly) {
      setWeeklyPremiumRows(createDefaultWeeklyPremiumRows());
    } else {
      setWeeklyPremiumRows([]);
    }
  }

  const buildRegisterCodeTx = async (_chainId: number, orgSlug: string) => {
    if (!payrollManagerAddress || !config) {
      throw new Error("Payroll manager config missing");
    }

    const slugBytes = ethers.utils.formatBytes32String(orgSlug);
    const codeName = earningsCodeName.trim().toUpperCase();
    if (!codeName) {
      throw new Error("Earnings code name is required");
    }
    const codeNameBytes = ethers.utils.formatBytes32String(codeName);

    const ruleAddress =
      ruleType === RuleType.Hourly
        ? config.hoursRuleAddress
        : ruleType === RuleType.Weekly
        ? config.weeklyScheduleRuleAddress
        : ruleType === RuleType.OneTime
        ? config.oneTimePaymentAddress
        : config.salaryPerSecondRuleAddress;

    let encodedConfig = "0x";

    if (ruleType === RuleType.Hourly) {
      let priorCap = -1;
      const flattenedBands = hourlyBands.flatMap((row, idx) => {
        const fallbackCap = idx === hourlyBands.length - 1 ? UINT32_MAX_NUM : 40;
        const isRemaining = row.isRemaining && idx === hourlyBands.length - 1;
        let maxHours = isRemaining ? UINT32_MAX_NUM : parseUint(row.maxHours, fallbackCap);
        if (maxHours <= priorCap) {
          maxHours = Math.min(UINT32_MAX_NUM, priorCap + 1);
        }
        const multiplierBps = parseMultiplierToBps(row.multiplier, 10_000);
        priorCap = maxHours;
        return [maxHours, multiplierBps];
      });

      const bands = flattenedBands.length > 0 ? flattenedBands : [40, 10000];

      encodedConfig = ethers.utils.defaultAbiCoder.encode(["uint32[]"], [bands]);
    } else if (ruleType === RuleType.Weekly) {
      const normalized = weeklyPremiumRows
        .map((row) => {
          let mask = 0n;
          for (let i = 0; i < WEEK_HOURS; i += 1) {
            if (row.mask[i]) mask |= 1n << BigInt(i);
          }
          const multiplier = Number(row.multiplier);
          const bips = Number.isFinite(multiplier)
            ? Math.max(0, Math.floor(multiplier * 10_000))
            : 0;

          return {
            mask,
            bips,
          };
        })
        .filter((row) => row.mask > 0n && row.bips > 0);

      const premiumMasks = normalized.map((row) => row.mask.toString());
      const premiumBips = normalized.map((row) => row.bips.toString());
      encodedConfig = ethers.utils.defaultAbiCoder.encode(["uint168[]", "uint16[]"], [premiumMasks, premiumBips]);
    }

    return {
      to: payrollManagerAddress,
      data: payrollManagerInterface.encodeFunctionData("registerEarningsCode", [
        slugBytes,
        codeNameBytes,
        ruleAddress,
        encodedConfig,
      ]),
    } as any;
  };

  const registerEarningsCode = useExecuteRawTx(
    buildRegisterCodeTx,
    (_: number, orgSlug: string) =>
      `Registered ${ruleType} earnings code for ${orgSlug}`
  );

  const canRegister = Boolean(canEdit && slug && payrollManagerAddress);

  const registerEarningsContent = (
    <Stack gap="sm">
      <Stack style={{ minWidth: 220 }}>
        <Text.Body size="sm" color="muted">Earnings Code Name</Text.Body>
        <Input
          value={earningsCodeName}
          onChange={(e) => setEarningsCodeName(e.target.value)}
          placeholder="e.g. HOURLY_OT"
          disabled={!canEdit}
        />
      </Stack>

      {ruleType === RuleType.Hourly && (
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
              key={`hourly-band-${index}`}
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
                disabled={!canEdit || hourlyBands.length <= 1}
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
                  cursor: !canEdit || hourlyBands.length <= 1 ? "not-allowed" : "pointer",
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
                  disabled={!canEdit}
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
                    disabled={!canEdit}
                  />
                </Stack>
              )}

              <Stack style={{ minWidth: 160, paddingBottom: "var(--spacing-xs)" }}>
                {index === hourlyBands.length - 1 ? (
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
                    <input
                      type="checkbox"
                      checked={band.isRemaining}
                      disabled={!canEdit}
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
            disabled={!canEdit}
          />
        </Stack>
      )}

      {ruleType === RuleType.Weekly && (
        <WeeklyScheduleConfigurator
          canEdit={canEdit}
          premiumRows={weeklyPremiumRows}
          onPremiumRowsChange={setWeeklyPremiumRows}
        />
      )}

      {ruleType === RuleType.OneTime && (
        <Text.Body size="sm" color="muted">
          One-Time rule uses empty config.
        </Text.Body>
      )}

      <Row justify="end" gap="sm">
        <ButtonSecondary
          style={{ flex: 0, minWidth: 132 }}
          onClick={() => setShowAddForm(false)}
        >
          Cancel
        </ButtonSecondary>
        <ButtonPrimary
          style={{ flex: 0, minWidth: 132 }}
          disabled={!canRegister || isRegistering}
          onClick={async () => {
            if (!chainId || isRegistering) return;
            setIsRegistering(true);
            try {
              await registerEarningsCode(chainId, slug);
              setShowAddForm(false);
            } finally {
              setIsRegistering(false);
            }
          }}
        >
          {isRegistering ? <Loader inline size={14} color="currentColor" /> : null}
          Register
        </ButtonPrimary>
      </Row>
    </Stack>
  );

  return (
    <Stack gap="sm">
      <Text.Title align="left" size="sm">Payroll Earnings</Text.Title>

      <Row gap="sm" align="center" justify="end" wrap>
        <Stack style={{ minWidth: 220, maxWidth: 320 }}>
          <Select<RuleType>
            value={ruleType}
            onChange={handleRuleTypeChange}
            disabled={!canEdit}
          >
            <SelectOption value={RuleType.Hourly} label="Hourly" />
            <SelectOption value={RuleType.Weekly} label="Weekly Schedule" />
            <SelectOption value={RuleType.OneTime} label="One-Time Payment" />
            <SelectOption value={RuleType.Salary} label="Salary" />
          </Select>
        </Stack>

        {isPhone ? (
          <ButtonPrimary
            onClick={() => setShowAddForm(true)}
            disabled={!canEdit}
            aria-label="Add earnings code"
            style={{
              flex: 0,
              width: 40,
              height: 40,
              minWidth: 40,
              minHeight: 40,
              padding: 0,
              borderRadius: "var(--radius-sm)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              fontSize: 22,
            }}
          >
            +
          </ButtonPrimary>
        ) : (
          <ButtonPrimary
            onClick={() => setShowAddForm(true)}
            disabled={!canEdit}
            style={{
              flex: 0,
              minWidth: 128,
              minHeight: 40,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            Add Earning
          </ButtonPrimary>
        )}
      </Row>

      {isPhone ? (
        <Sheet open={showAddForm} onClose={() => setShowAddForm(false)} placement="bottom">
          <Text.Label>Register Earnings Code</Text.Label>
          <div style={{ height: 8 }} />
          {registerEarningsContent}
        </Sheet>
      ) : (
        <Modal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          title="Register Earnings Code"
          width={760}
          maxWidth={"96vw"}
        >
          {registerEarningsContent}
        </Modal>
      )}

      <PayrollEarningsCatalogManager
        slug={slug}
        canEdit={canEdit}
        earningsCodes={earningsCodes}
        loading={loading}
      />
    </Stack>
  );
}
