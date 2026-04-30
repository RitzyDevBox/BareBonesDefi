import React, { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { Card, CardContent } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { NumberInput } from "../Inputs/NumberInput";
import { Select, SelectOption } from "../Select";
import type { TableRowData } from "../Table";
import { useToastStore } from "../Toasts/useToastStore";
import { ToastType, ToastBehavior, ToastPosition } from "../Toasts/toast.types";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";
import { DEFAULT_PAY_BATCH_CODE } from "../../constants/payroll";
import { shortAddress } from "../../utils/formatUtils";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import { orgSlugFor } from "../../utils/payroll/orgSlug";

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
  payeeId: number;
  rowData: TableRowData;
  canEdit?: boolean;
}

export function PayrollRuleConfigurator({ slug, payeeId, rowData, canEdit = false }: PayrollRuleConfiguratorProps) {
  const payeeAddress = rowData.cells.address;
  const payeeName = rowData.cells.name;

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
  const isWalletConnected = Boolean(chainId && provider);
  const canEditPayroll = canEdit && isWalletConnected;

  const payrollManagerInterface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  React.useEffect(() => {
    const loadPayrollState = async () => {
      if (!chainId || !provider || !payrollManagerAddress || !slug) {
        return;
      }

      setIsLoadingPayrollState(true);
      try {
        const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
        const slugBytes = orgSlugFor(slug);

        const page = await contract.getPayBatchPayeesWithDefaults(slugBytes, DEFAULT_PAY_BATCH_CODE, 0, 500);
        const rows: any[] = page?.rows ?? page?.[0] ?? [];
        const payee = rows.find((row) => Number(row.payeeId?.toString?.() ?? "0") === payeeId);
        const earnings: any[] = payee?.earnings ?? [];

        if (payee) {
          setDefaultHours("40");

          // Prefer rule-based inference (ignore payType from contract for now)
          let appliedRuleType = PayrollRuleType.HoursThreshold;

          const earning = earnings && earnings.length > 0 ? earnings[0] : null;

          if (earning) {
            const ruleAddr: string = earning.rule;
            const earningRate: any = earning.rate;
            const configBytes: string = earning.config;

              if (ruleAddr.toLowerCase() === (config?.hoursRuleAddress ?? "").toLowerCase()) {
                appliedRuleType = PayrollRuleType.HoursThreshold;
              } else if (ruleAddr.toLowerCase() === (config?.oneTimePaymentAddress ?? "").toLowerCase()) {
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
  }, [chainId, provider, payrollManagerAddress, slug, payeeId, config?.hoursRuleAddress, config?.oneTimePaymentAddress]);

  const buildConfigurePayrollTx = React.useCallback(
    async (_chainId: number, slugInput: string, payeeIdInput: number) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address is not configured");
      }

      const slugBytes = orgSlugFor(slugInput);
      const parsedRate = ethers.utils.parseEther(rate || "0");

      const earningsRule =
        ruleType === PayrollRuleType.HoursThreshold
          ? config?.hoursRuleAddress
          : ruleType === PayrollRuleType.FlatAmount
          ? config?.oneTimePaymentAddress
          : config?.commissionRuleAddress;

      if (!earningsRule) {
        throw new Error("Earnings rule contract address missing");
      }

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

      const readContract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      let cursor = 0;
      let selectedEarningsCodeId: ethers.BigNumberish | null = null;
      while (selectedEarningsCodeId === null) {
        const page = await readContract.getOrganizationEarningsCodes(slugBytes, cursor, 100);
        const rows: any[] = page?.rows ?? page?.[0] ?? [];
        const hasMore = Boolean(page?.hasMore ?? page?.[1]);

        const match = rows.find(
          (row) =>
            Boolean(row.isActive) &&
            String(row.rule || "").toLowerCase() === String(earningsRule).toLowerCase()
        );

        if (match) {
          selectedEarningsCodeId = match.earningsCodeId;
          break;
        }

        if (!hasMore || rows.length === 0) {
          break;
        }

        cursor += rows.length;
      }

      if (selectedEarningsCodeId == null) {
        throw new Error("No earnings code found for selected rule");
      }

      const encoded = payrollManagerInterface.encodeFunctionData(
        "configurePayBatch",
        [
          slugBytes,
          DEFAULT_PAY_BATCH_CODE,
          payeeIdInput,
          [{ earningsCodeId: selectedEarningsCodeId, rate: parsedRate, runData: encodedConfig }],
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
    (_: number, slugInput: string, payeeIdInput: number) =>
      `Payroll configured for payee ${payeeIdInput} (${payeeAddress}, ${payeeName}, ${slugInput})`
  );

  const handleConfigureRule = async () => {
    if (!canEditPayroll) return;
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
    
    await configurePayroll(Number(chainId), slug, payeeId);
  };

  if (isLoadingPayrollState) {
    return (
      <Card style={{ backgroundColor: "var(--colors-background)", border: "1px solid var(--colors-border)" }}>
        <CardContent>
          <Stack gap="md">
            <Text.Label>Loading payee payroll config...</Text.Label>
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
          {!canEditPayroll && (
            <Row gap="xs" align="center">
              <Text.Body size="xs" color="warn">
                ⚠️ Read Only: Only Organization Owner
              </Text.Body>
            </Row>
          )}

          <Text.Title align="left" size="sm">Configure Payroll Rule</Text.Title>

          <Stack>
            <Text.Body color="muted">
              Payee: <strong>{shortAddress(payeeAddress)}</strong>
            </Text.Body>
            <Text.Body color="muted">
              Name: <strong>{payeeName}</strong>
            </Text.Body>
          </Stack>

          <Stack>
            <Text.Label style={{ fontSize: "0.875rem" }}>Rule</Text.Label>
            <Select
              value={ruleType}
              onChange={setRuleType}
              style={{ width: "100%" }}
              disabled={!canEditPayroll}
            >
              <SelectOption value={PayrollRuleType.HoursThreshold} label="Hours Threshold" />
              <SelectOption value={PayrollRuleType.FlatAmount} label="Flat Amount" />
            </Select>
          </Stack>

          <Stack>
            <Text.Label style={{ fontSize: "0.875rem" }}>Base Rate</Text.Label>
            <NumberInput
              value={rate}
              onChange={(e) => setRate((e.target as HTMLInputElement).value)}
              placeholder="e.g. 20"
              allowDecimal
              disabled={!canEditPayroll}
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
                disabled={!canEditPayroll}
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
                    disabled={!canEditPayroll}
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
                  <Text.Body>Configure Active Hour Bounds</Text.Body>
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
                      disabled={!canEditPayroll}
                    />
                  </Stack>

                  <Stack>
                    <Text.Body size="sm" color="muted">End Hours</Text.Body>
                    <NumberInput
                      value={hoursEnd}
                      onChange={(e) => setHoursEnd((e.target as HTMLInputElement).value)}
                      placeholder="uint256.max"
                      allowDecimal={false}
                      disabled={!canEditPayroll}
                    />
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}

          <Row gap="sm" justify="end">
            <ButtonPrimary onClick={handleConfigureRule} style={{ flex: 0 }} disabled={!canEditPayroll}>
              Save
            </ButtonPrimary>
          </Row>
        </Stack>
      </CardContent>
    </Card>
  );
}
