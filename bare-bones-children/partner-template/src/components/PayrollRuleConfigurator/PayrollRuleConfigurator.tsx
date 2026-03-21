import React, { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { Card, CardContent } from "../BasicComponents";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { NumberInput } from "../Inputs/NumberInput";
import type { TableRowData } from "../Table";
import { useToastStore } from "../Toasts/useToastStore";
import { ToastType, ToastBehavior, ToastPosition } from "../Toasts/toast.types";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";

export enum PayrollPayType {
  Hourly = 0,
  Salary = 1,
  Commission = 2,
}

export enum PayrollRuleType {
  HoursThreshold = "hours",
  FlatAmount = "flat",
}

export interface EarningsCode {
  rule: string;
  rate: string; // human-editable decimal stable value
  config: string; // encoded bytes (in contract)
}

interface PayrollRuleConfiguratorProps {
  slug: string;
  employeeId: number;
  rowData: TableRowData;
}

export function PayrollRuleConfigurator({ slug, employeeId, rowData }: PayrollRuleConfiguratorProps) {
  const employeeAddress = rowData.cells.address;
  const employeeRole = rowData.cells.role;

  const { showToast } = useToastStore();
  const { chainId, provider } = useWalletProvider();

  const [isLoadingPayrollState, setIsLoadingPayrollState] = useState(false);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;

  // state
  const [ruleType, setRuleType] = useState<PayrollRuleType>(PayrollRuleType.HoursThreshold);
  const [defaultHours, setDefaultHours] = useState<string>("40");
  const [rate, setRate] = useState<string>("0");
  const [enableCustomHours, setEnableCustomHours] = useState(false);
  const [hoursStart, setHoursStart] = useState<string>("0");
  const [hoursEnd, setHoursEnd] = useState<string>(ethers.constants.MaxUint256.toString());

  const isHoursThreshold = ruleType === PayrollRuleType.HoursThreshold;
  const payType = isHoursThreshold ? PayrollPayType.Hourly : PayrollPayType.Salary;

  const payrollManagerInterface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  React.useEffect(() => {
    const loadPayrollState = async () => {
      if (!chainId || !provider || !payrollManagerAddress || !slug) {
        return;
      }

      setIsLoadingPayrollState(true);
      try {
        const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
        const slugBytes = ethers.utils.formatBytes32String(slug);

        const payrollStateResult = await contract.payrollState(slugBytes, employeeId);

        const exists = payrollStateResult.exists;
        const defaultHoursValue = payrollStateResult.defaultHoursPerPeriod;
        const earnings: any[] = payrollStateResult.earnings;

        if (exists) {
          setDefaultHours(defaultHoursValue.toString());

          // Prefer rule-based inference (ignore payType from contract for now)
          let appliedRuleType = PayrollRuleType.HoursThreshold;

          const earning = earnings && earnings.length > 0 ? earnings[0] : null;

          if (earning) {
            const ruleAddr: string = earning.rule;
            const earningRate: any = earning.rate;
            const configBytes: string = earning.config;

              if (ruleAddr.toLowerCase() === (config?.hoursRuleAddress ?? "").toLowerCase()) {
                appliedRuleType = PayrollRuleType.HoursThreshold;
              } else if (ruleAddr.toLowerCase() === (config?.flatRuleAddress ?? "").toLowerCase()) {
                appliedRuleType = PayrollRuleType.FlatAmount;
              } else {
                appliedRuleType = PayrollRuleType.HoursThreshold;
              }

              setRuleType(appliedRuleType);

              // Rate from earnings code in wei -> decimal string
              try {
                setRate(ethers.utils.formatEther(earningRate));
              } catch {
                setRate("0");
              }

              if (appliedRuleType === PayrollRuleType.HoursThreshold) {
                if (configBytes && configBytes !== "0x") {
                  const decoded = ethers.utils.defaultAbiCoder.decode(["uint256", "uint256"], configBytes);
                  const startVal = decoded[0] as ethers.BigNumber;
                  const endVal = decoded[1] as ethers.BigNumber;
                  setHoursStart(startVal.toString());
                  setHoursEnd(endVal.toString());

                  if (endVal.eq(ethers.constants.MaxUint256)) {
                    setEnableCustomHours(false);
                  } else {
                    setEnableCustomHours(true);
                  }
                } else {
                  setEnableCustomHours(false);
                  setHoursStart("0");
                  setHoursEnd(ethers.constants.MaxUint256.toString());
                }
              } else {
                // Flat amount has no hours bounds
                setEnableCustomHours(false);
                setHoursStart("0");
                setHoursEnd(ethers.constants.MaxUint256.toString());
              }
          }
        }
      } catch (error) {
        console.error("Failed to load payrollState", error);
      } finally {
        setIsLoadingPayrollState(false);
      }
    };

    loadPayrollState();
  }, [chainId, provider, payrollManagerAddress, slug, employeeId, config?.hoursRuleAddress, config?.flatRuleAddress]);

  const buildConfigurePayrollTx = React.useCallback(
    (_chainId: number, slugInput: string, employeeIdInput: number) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address is not configured");
      }

      const slugBytes = ethers.utils.formatBytes32String(slugInput);
      const parsedRate = ethers.utils.parseEther(rate || "0");

      const earningsRule =
        ruleType === PayrollRuleType.HoursThreshold
          ? config?.hoursRuleAddress
          : ruleType === PayrollRuleType.FlatAmount
          ? config?.flatRuleAddress
          : config?.commissionRuleAddress;

      if (!earningsRule) {
        throw new Error("Earnings rule contract address missing");
      }

      const defaultHoursValue = isHoursThreshold ? Number(defaultHours) || 0 : 0;

      let encodedConfig = "0x";
      if (ruleType === PayrollRuleType.HoursThreshold) {
        const start = Number(hoursStart) || 0;
        const end = enableCustomHours ? ethers.BigNumber.from(hoursEnd) : ethers.constants.MaxUint256;
        encodedConfig = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint256"],
          [start, end]
        );
      } else if (ruleType === PayrollRuleType.FlatAmount) {
        encodedConfig = "0x";
      }

      const encoded = payrollManagerInterface.encodeFunctionData(
        "configureEmployeePayroll",
        [
          slugBytes,
          employeeIdInput,
          payType,
          defaultHoursValue,
          [{ rule: earningsRule, rate: parsedRate, config: encodedConfig }],
        ]
      );

      return {
        to: payrollManagerAddress,
        value: 0,
        data: encoded,
      };
    },
    [config, ruleType, defaultHours, rate, hoursStart, hoursEnd, enableCustomHours, payrollManagerAddress, payrollManagerInterface]
  );

  const configurePayroll = useExecuteRawTx(
    buildConfigurePayrollTx,
    (_: number, slugInput: string, employeeIdInput: number) =>
      `Payroll configured for employee ${employeeIdInput} (${employeeAddress}, ${employeeRole}, ${slugInput})`
  );

  const handleConfigureRule = async () => {
    if (!slug || !payrollManagerAddress) return;
    
    // Validate start <= end when custom hours enabled
    if (enableCustomHours && isHoursThreshold) {
      const start = Number(hoursStart) || 0;
      const end = ethers.BigNumber.from(hoursEnd);
      const startBN = ethers.BigNumber.from(start);
      if (startBN.gt(end)) {
        showToast({
          id: `payroll-error-${Date.now()}`,
          title: "Validation Error",
          message: "Start hours cannot be greater than end hours",
          type: ToastType.Error,
          behavior: ToastBehavior.AutoClose,
          position: ToastPosition.Top,
          durationMs: 5000,
        });
        return;
      }
    }
    
    await configurePayroll(Number(chainId), slug, employeeId);
  };

  if (isLoadingPayrollState) {
    return (
      <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
        <CardContent>
          <Stack gap="md">
            <Text.Label>Loading employee payroll config...</Text.Label>
            <Text.Body size="sm" color="muted">Fetching existing state from PayrollManager...</Text.Body>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
      <CardContent>
        <Stack gap="md">
          <Text.Label>Configure Payroll Rule</Text.Label>

          <Stack>
            <Text.Body size="sm" color="muted">
              Employee: <strong>{employeeAddress}</strong>
            </Text.Body>
            <Text.Body size="sm" color="muted">
              Role: <strong>{employeeRole}</strong>
            </Text.Body>
          </Stack>

          <Stack>
            <Text.Label style={{ fontSize: "0.875rem" }}>Rule</Text.Label>
            <Row gap="md">
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as PayrollRuleType)}
                style={{ width: "100%", padding: "var(--spacing-md)", borderRadius: "var(--radius-md)", border: "1px solid var(--colors-border)" }}
              >
                <option value={PayrollRuleType.HoursThreshold}>Hours Threshold</option>
                <option value={PayrollRuleType.FlatAmount}>Flat Amount</option>
              </select>
            </Row>
          </Stack>

          <Stack>
            <Text.Label style={{ fontSize: "0.875rem" }}>Base Rate</Text.Label>
            <NumberInput
              value={rate}
              onChange={(e) => setRate((e.target as HTMLInputElement).value)}
              placeholder="e.g. 20"
              allowDecimal
            />
          </Stack>

          {isHoursThreshold && (
            <Stack>
              <Text.Label style={{ fontSize: "0.875rem" }}>Default Hours Per Period</Text.Label>
              <NumberInput
                value={defaultHours}
                onChange={(e) => setDefaultHours((e.target as HTMLInputElement).value)}
                placeholder="e.g. 40"
                allowDecimal={false}
              />
            </Stack>
          )}

          {isHoursThreshold && (
            <Stack gap="md">
              <Stack>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                  <input
                    type="checkbox"
                    checked={enableCustomHours}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setEnableCustomHours(newValue);
                      // Reset to defaults when unchecking
                      if (!newValue) {
                        setHoursStart("0");
                        setHoursEnd(ethers.constants.MaxUint256.toString());
                      }
                    }}
                  />
                  <Text.Body size="sm">Configure Active Hour Bounds</Text.Body>
                </label>
              </Stack>

              {enableCustomHours && (
                <Stack gap="md">
                  <Stack>
                    <Text.Body size="sm" color="muted">Start Hours</Text.Body>
                    <NumberInput
                      value={hoursStart}
                      onChange={(e) => setHoursStart((e.target as HTMLInputElement).value)}
                      placeholder="0"
                      allowDecimal={false}
                    />
                  </Stack>

                  <Stack>
                    <Text.Body size="sm" color="muted">End Hours</Text.Body>
                    <NumberInput
                      value={hoursEnd}
                      onChange={(e) => setHoursEnd((e.target as HTMLInputElement).value)}
                      placeholder="uint256.max"
                      allowDecimal={false}
                    />
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}

          <Row gap="sm" justify="end">
            <ButtonSecondary style={{ flex: 0 }}>Cancel</ButtonSecondary>
            <ButtonPrimary onClick={handleConfigureRule} style={{ flex: 0 }}>
              Save Rule
            </ButtonPrimary>
          </Row>
        </Stack>
      </CardContent>
    </Card>
  );
}
