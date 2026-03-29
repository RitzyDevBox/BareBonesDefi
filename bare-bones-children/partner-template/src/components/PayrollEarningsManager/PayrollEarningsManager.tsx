import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent, Input } from "../BasicComponents";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { NumberInput } from "../Inputs/NumberInput";
import { Select, SelectOption } from "../Select";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { PayeeModel } from "../../models/payments";
import type { OrganizationEarningsCodeView } from "../../utils/payroll/fetchPayrollViews";

type RuleType = "hourly" | "oneTime" | "salary";
type HourlyMode = "base" | "overtime";

interface PayrollEarningsManagerProps {
  slug: string;
  canEdit: boolean;
  payees: PayeeModel[];
  organizationEarningsCodes: OrganizationEarningsCodeView[];
}

function parseUint(value: string, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

export function PayrollEarningsManager({
  slug,
  canEdit,
  payees,
  organizationEarningsCodes,
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
  const [hourlyMode, setHourlyMode] = useState<HourlyMode>("overtime");
  const [hourCap, setHourCap] = useState("40");
  const [baseMultiplierBps, setBaseMultiplierBps] = useState("10000");
  const [otMultiplierBps, setOtMultiplierBps] = useState("15000");
  const [salaryPeriodDays, setSalaryPeriodDays] = useState("7");

  const [selectedPayeeId, setSelectedPayeeId] = useState<string>("");
  const [selectedEarningsCodeId, setSelectedEarningsCodeId] = useState<string>("");
  const [assignmentRate, setAssignmentRate] = useState<string>("0");
  const [assignmentHoursWorked, setAssignmentHoursWorked] = useState<string>("40");

  const selectedCode = useMemo(
    () =>
      organizationEarningsCodes.find(
        (row) => row.earningsCodeId.toString() === selectedEarningsCodeId
      ) ?? null,
    [organizationEarningsCodes, selectedEarningsCodeId]
  );

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
      const cap = parseUint(hourCap, 40);
      const baseBps = parseUint(baseMultiplierBps, 10_000);
      const otBps = parseUint(otMultiplierBps, 15_000);

      const bands =
        hourlyMode === "overtime"
          ? [cap, baseBps, 4294967295, otBps]
          : [cap, baseBps];

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

  const buildAssignCodeToPayeeTx = async (
    _chainId: number,
    orgSlug: string,
    payeeIdRaw: string,
    earningsCodeIdRaw: string
  ) => {
    if (!payrollManagerAddress) {
      throw new Error("Payroll manager config missing");
    }

    const slugBytes = ethers.utils.formatBytes32String(orgSlug);
    const payeeId = ethers.BigNumber.from(payeeIdRaw);
    const earningsCodeId = ethers.BigNumber.from(earningsCodeIdRaw);

    const rate = ethers.utils.parseEther(assignmentRate || "0");

    const isHourlyCode =
      selectedCode &&
      config &&
      selectedCode.rule.toLowerCase() === config.hoursRuleAddress.toLowerCase();

    const runData = isHourlyCode
      ? ethers.utils.defaultAbiCoder.encode(["uint32"], [parseUint(assignmentHoursWorked, 40)])
      : "0x";

    return {
      to: payrollManagerAddress,
      data: payrollManagerInterface.encodeFunctionData("configurePayeePayroll", [
        slugBytes,
        payeeId,
        [{ earningsCodeId, rate, runData }],
      ]),
    } as any;
  };

  const assignCodeToPayee = useExecuteRawTx(
    buildAssignCodeToPayeeTx,
    (_: number, orgSlug: string, payeeIdRaw: string, earningsCodeIdRaw: string) =>
      `Configured payee ${payeeIdRaw} with earnings code ${earningsCodeIdRaw} for ${orgSlug}`
  );

  const canRegister = Boolean(canEdit && slug && payrollManagerAddress);
  const canAssign = Boolean(
    canEdit &&
      slug &&
      payrollManagerAddress &&
      selectedPayeeId &&
      selectedEarningsCodeId
  );

  return (
    <Card>
      <CardContent>
        <Stack gap="md">
          <Text.Title align="left" size="sm">Payroll Earnings Management</Text.Title>

          <Card style={{ border: "1px solid var(--colors-border)" }}>
            <CardContent>
              <Stack gap="sm">
                <Text.Label>1) Register Organization Earnings Code</Text.Label>

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
                    <Stack>
                      <Text.Body size="sm" color="muted">Hourly Config Mode</Text.Body>
                      <Select<HourlyMode>
                        value={hourlyMode}
                        onChange={setHourlyMode}
                        disabled={!canEdit}
                      >
                        <SelectOption value="overtime" label="Overtime Bands" />
                        <SelectOption value="base" label="Base Only" />
                      </Select>
                    </Stack>

                    <Row gap="sm" wrap>
                      <Stack style={{ flex: 1, minWidth: 120 }}>
                        <Text.Body size="sm" color="muted">Cap Hours</Text.Body>
                        <NumberInput value={hourCap} onChange={(e) => setHourCap((e.target as HTMLInputElement).value)} allowDecimal={false} disabled={!canEdit} />
                      </Stack>
                      <Stack style={{ flex: 1, minWidth: 120 }}>
                        <Text.Body size="sm" color="muted">Base BPS</Text.Body>
                        <NumberInput value={baseMultiplierBps} onChange={(e) => setBaseMultiplierBps((e.target as HTMLInputElement).value)} allowDecimal={false} disabled={!canEdit} />
                      </Stack>
                      {hourlyMode === "overtime" && (
                        <Stack style={{ flex: 1, minWidth: 120 }}>
                          <Text.Body size="sm" color="muted">OT BPS</Text.Body>
                          <NumberInput value={otMultiplierBps} onChange={(e) => setOtMultiplierBps((e.target as HTMLInputElement).value)} allowDecimal={false} disabled={!canEdit} />
                        </Stack>
                      )}
                    </Row>
                  </Stack>
                )}

                {ruleType === "salary" && (
                  <Stack style={{ maxWidth: 220 }}>
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
                    One-Time rule uses empty config bytes.
                  </Text.Body>
                )}

                <Row justify="end">
                  <ButtonPrimary
                    style={{ flex: 0 }}
                    disabled={!canRegister}
                    onClick={() => registerEarningsCode(chainId!, slug)}
                  >
                    Register Earnings Code
                  </ButtonPrimary>
                </Row>
              </Stack>
            </CardContent>
          </Card>

          <Card style={{ border: "1px solid var(--colors-border)" }}>
            <CardContent>
              <Stack gap="sm">
                <Text.Label>2) Assign Earnings Code to Payee</Text.Label>

                <Stack>
                  <Text.Body size="sm" color="muted">Payee</Text.Body>
                  <Select<string>
                    value={selectedPayeeId || null}
                    onChange={(v) => setSelectedPayeeId(String(v))}
                    disabled={!canEdit}
                  >
                    {payees.map((payee) => (
                      <SelectOption
                        key={payee.payeeId.toString()}
                        value={payee.payeeId.toString()}
                        label={`#${payee.payeeId.toString()} · ${payee.paymentAddress}`}
                      />
                    ))}
                  </Select>
                </Stack>

                <Stack>
                  <Text.Body size="sm" color="muted">Earnings Code</Text.Body>
                  <Select<string>
                    value={selectedEarningsCodeId || null}
                    onChange={(v) => setSelectedEarningsCodeId(String(v))}
                    disabled={!canEdit}
                  >
                    {organizationEarningsCodes.map((code) => (
                      <SelectOption
                        key={code.earningsCodeId.toString()}
                        value={code.earningsCodeId.toString()}
                        label={`#${code.earningsCodeId.toString()} · ${code.isActive ? "Active" : "Inactive"}`}
                      />
                    ))}
                  </Select>
                </Stack>

                <Stack style={{ maxWidth: 280 }}>
                  <Text.Body size="sm" color="muted">Rate</Text.Body>
                  <Input
                    value={assignmentRate}
                    onChange={(e) => setAssignmentRate(e.target.value)}
                    placeholder="e.g. 20"
                    disabled={!canEdit}
                  />
                </Stack>

                {selectedCode &&
                  config &&
                  selectedCode.rule.toLowerCase() === config.hoursRuleAddress.toLowerCase() && (
                    <Stack style={{ maxWidth: 280 }}>
                      <Text.Body size="sm" color="muted">Hours Worked (runData)</Text.Body>
                      <NumberInput
                        value={assignmentHoursWorked}
                        onChange={(e) => setAssignmentHoursWorked((e.target as HTMLInputElement).value)}
                        allowDecimal={false}
                        disabled={!canEdit}
                      />
                    </Stack>
                  )}

                <Row justify="end">
                  <ButtonPrimary
                    style={{ flex: 0 }}
                    disabled={!canAssign}
                    onClick={() =>
                      assignCodeToPayee(
                        chainId!,
                        slug,
                        selectedPayeeId,
                        selectedEarningsCodeId
                      )
                    }
                  >
                    Assign to Payee
                  </ButtonPrimary>
                </Row>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </CardContent>
    </Card>
  );
}
