import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { NumberInput } from "../Inputs/NumberInput";
import { Select, SelectOption } from "../Select";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";

type RuleType = "hourly" | "oneTime" | "salary";
const UINT32_MAX_NUM = 4294967295;

interface HourlyBandRow {
  maxHours: string;
  multiplier: string;
  isRemaining: boolean;
}

interface PayrollEarningsManagerProps {
  slug: string;
  canEdit: boolean;
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
}: PayrollEarningsManagerProps) {
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

  const [ruleType, setRuleType] = useState<RuleType>("hourly");
  const [hourlyBands, setHourlyBands] = useState<HourlyBandRow[]>([
    { maxHours: "40", multiplier: "1", isRemaining: false },
    { maxHours: UINT32_MAX_NUM.toString(), multiplier: "1.5", isRemaining: true },
  ]);
  const [salaryPeriodDays, setSalaryPeriodDays] = useState("7");

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

  const buildRegisterCodeTx = async (_chainId: number, orgSlug: string) => {
    if (!payrollManagerAddress || !config) {
      throw new Error("Payroll manager config missing");
    }

    const slugBytes = ethers.utils.formatBytes32String(orgSlug);

    const ruleAddress =
      ruleType === "hourly"
        ? config.hoursRuleAddress
        : ruleType === "oneTime"
        ? config.oneTimePaymentAddress
        : config.salaryPerSecondRuleAddress;

    let encodedConfig = "0x";

    if (ruleType === "hourly") {
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
    } else if (ruleType === "salary") {
      const periodDays = parseUint(salaryPeriodDays, 7);
      encodedConfig = ethers.utils.defaultAbiCoder.encode(["uint32"], [periodDays]);
    }

    return {
      to: payrollManagerAddress,
      data: payrollManagerInterface.encodeFunctionData("registerEarningsCode", [
        slugBytes,
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

  return (
    <Stack gap="sm">
      <Text.Title align="left" size="sm">Payroll Earnings</Text.Title>

      <Stack
        gap="sm"
        style={{
          border: "1px solid var(--colors-border)",
          borderRadius: "var(--radius-md)",
          padding: "var(--spacing-md)",
          backgroundColor: "var(--colors-surface)",
        }}
      >
        <Stack>
          <Text.Body size="sm" color="muted">Rule Type</Text.Body>
          <Select<RuleType>
            value={ruleType}
            onChange={setRuleType}
            disabled={!canEdit}
          >
            <SelectOption value="hourly" label="Hourly" />
            <SelectOption value="oneTime" label="One-Time Payment" />
            <SelectOption value="salary" label="Salary" />
          </Select>
        </Stack>

        {ruleType === "hourly" && (
          <Stack gap="sm">
            <Text.Body size="sm" color="muted">
              Bands use decimal multipliers (example: 1.5 for overtime).
            </Text.Body>

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
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid var(--colors-border)",
                      background: "var(--colors-background)",
                      color: "var(--colors-text)",
                      cursor: !canEdit || hourlyBands.length <= 1 ? "not-allowed" : "pointer",
                      lineHeight: 1,
                      fontSize: 14,
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

                  <Stack style={{ flexBasis: "100%" }}>
                    <Text.Body size="xs" color="muted">
                      {(() => {
                        const priorCap = index === 0 ? 0 : parseUint(hourlyBands[index - 1].maxHours, 0);
                        const fromHour = index === 0 ? 0 : priorCap;
                        const multiplier = band.multiplier || "1";

                        if (band.isRemaining) {
                          return `Any Hours over ${priorCap} will use rate * ${multiplier}.`;
                        }

                        const cap = parseUint(band.maxHours, Math.max(0, fromHour));
                        return `Hours ${Math.max(0, fromHour)}-${cap} use rate * ${multiplier}.`;
                      })()}
                    </Text.Body>
                  </Stack>
                </Row>
              ))}
            </Stack>

            <Row justify="between" align="center" wrap>
              <Text.Body size="xs" color="muted">
                Tip: mark one band as Remaining Hours to cover everything after prior caps.
              </Text.Body>
              <ButtonSecondary
                style={{ flex: 0 }}
                disabled={!canEdit}
                onClick={addHourlyBand}
              >
                Add Band
              </ButtonSecondary>
            </Row>
          </Stack>
        )}

        {ruleType === "salary" && (
          <Stack style={{ maxWidth: 260 }}>
            <Text.Body size="sm" color="muted">Salary Period (days)</Text.Body>
            <NumberInput
              value={salaryPeriodDays}
              onChange={(e) => setSalaryPeriodDays((e.target as HTMLInputElement).value)}
              allowDecimal={false}
              disabled={!canEdit}
            />
          </Stack>
        )}

        {ruleType === "oneTime" && (
          <Text.Body size="sm" color="muted">
            One-Time rule uses empty config.
          </Text.Body>
        )}

        <Row justify="end">
          <ButtonPrimary
            style={{ flex: 0 }}
            disabled={!canRegister}
            onClick={() => registerEarningsCode(chainId!, slug)}
          >
            Register Code
          </ButtonPrimary>
        </Row>
      </Stack>
    </Stack>
  );
}
