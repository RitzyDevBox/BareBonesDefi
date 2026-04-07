import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { Select, SelectOption } from "../components/Select";
import { PayrollNavigation } from "../components/PayrollNavigation";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import {
  DEFAULT_PAY_BATCH_LABEL,
  DEFAULT_PAY_BATCH_CODE,
  PAYROLL_WINDOW_DAYS,
  PayrollWindowPreset,
} from "../constants/payroll";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel } from "../models/payments";
import { fetchPayBatchCodes } from "../utils/payroll/fetchPayBatchViews";
import {
  formatDateInputValue,
  formatDateTime,
  localDateEndUnix,
  localDateStartUnix,
  parseBatchCodeLabel,
  parsePayrollRunRow,
  shiftDateValue,
  type PayrollRunRowView,
} from "../utils/payroll/payrollFormatters";
import { ROUTES } from "../routes";

enum PayrollStatus {
  None = 0,
  Draft = 1,
  Processing = 2,
  Processed = 3,
  Finalizing = 4,
  Finalized = 5,
  Cancelled = 6,
}

function payrollStatusLabel(status: number) {
  if (status === PayrollStatus.Draft) return "Draft";
  if (status === PayrollStatus.Processing) return "Processing";
  if (status === PayrollStatus.Processed) return "Processed";
  if (status === PayrollStatus.Finalizing) return "Finalizing";
  if (status === PayrollStatus.Finalized) return "Finalized";
  if (status === PayrollStatus.Cancelled) return "Cancelled";
  return "None";
}

function payrollStatusColor(status: number): "main" | "secondary" | "label" | "muted" | "danger" | "warn" | "success" {
  if (status === PayrollStatus.Draft) return "warn";
  if (status === PayrollStatus.Processing) return "secondary";
  if (status === PayrollStatus.Processed) return "secondary";
  if (status === PayrollStatus.Finalizing) return "warn";
  if (status === PayrollStatus.Finalized) return "success";
  if (status === PayrollStatus.Cancelled) return "danger";
  return "muted";
}


export function PayrollsPage() {
  const navigate = useNavigate();
  const { organizationId } = useParams<{ organizationId: string }>();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [loading, setLoading] = useState(false);
  const [creatingPayroll, setCreatingPayroll] = useState(false);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payBatchCodes, setPayBatchCodes] = useState<string[]>([]);
  const [activePayrolls, setActivePayrolls] = useState<PayrollRunRowView[]>([]);

  const today = useMemo(() => new Date(), []);
  const [windowPreset, setWindowPreset] = useState<PayrollWindowPreset>(PayrollWindowPreset.Weekly);
  const [startDateInput, setStartDateInput] = useState<string>(formatDateInputValue(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)));
  const [endDateInput, setEndDateInput] = useState<string>(formatDateInputValue(today));
  const [selectedBatchCode, setSelectedBatchCode] = useState<string | null>(null);

  useEffect(() => {
    if (windowPreset === PayrollWindowPreset.Custom) return;
    const windowDays = PAYROLL_WINDOW_DAYS[windowPreset];
    setEndDateInput(shiftDateValue(startDateInput, windowDays - 1));
  }, [windowPreset, startDateInput]);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  const createPayrollTx = useExecuteRawTx(
    (_: number, orgSlug: string, startTime: number, endTime: number, payBatchCode: string | null) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");

      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const data = payBatchCode
        ? iface.encodeFunctionData("createPayroll", [slugBytes, payBatchCode, startTime, endTime])
        : iface.encodeFunctionData("createPayroll", [slugBytes, ethers.constants.HashZero, startTime, endTime]);

      return {
        to: payrollManagerAddress,
        data,
      } as any;
    },
    (_: number, orgSlug: string, startTime: number, endTime: number, payBatchCode: string | null) =>
      payBatchCode
        ? `Created payroll for ${orgSlug} using ${parseBatchCodeLabel(payBatchCode)} [${startTime}-${endTime}]`
        : `Created empty payroll for ${orgSlug} [${startTime}-${endTime}]`
  );

  async function refreshData(orgSlug: string) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    try {
      const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const org = await manager.organizations(slugBytes);

      setOrgInfo({ owner: org.owner, exists: org.exists });
      setIsAdmin(Boolean(org.exists && org.owner.toLowerCase() === account?.toLowerCase()));

      if (!org.exists) {
        setPayBatchCodes([]);
        setActivePayrolls([]);
        return;
      }

      const codes = await fetchPayBatchCodes(provider, payrollManagerAddress, orgSlug, account ?? undefined);
      setPayBatchCodes(codes);

      const hasDefaultBatch = codes.includes(DEFAULT_PAY_BATCH_CODE);
      if (!selectedBatchCode) {
        setSelectedBatchCode(hasDefaultBatch ? DEFAULT_PAY_BATCH_CODE : (codes[0] ?? null));
      } else if (!codes.includes(selectedBatchCode)) {
        setSelectedBatchCode(hasDefaultBatch ? DEFAULT_PAY_BATCH_CODE : (codes[0] ?? null));
      }

      const orgMap = await manager.slugToOrgInfoMap(slugBytes);
      const nextPayrollIdBn: ethers.BigNumber = orgMap.nextPayrollId ?? orgMap[0] ?? ethers.BigNumber.from(0);
      const nextPayrollId = nextPayrollIdBn.toNumber();

      if (nextPayrollId <= 0) {
        setActivePayrolls([]);
        return;
      }

      const ids = Array.from({ length: nextPayrollId }, (_, i) => nextPayrollId - 1 - i);
      const rows = await Promise.all(
        ids.map(async (payrollId) => {
          const run = await manager.slugToPayrollToRunMap(slugBytes, payrollId);
          const progress = await manager.getPayrollNodeProgress(slugBytes, payrollId);

          return parsePayrollRunRow(payrollId, run, progress);
        })
      );

      setActivePayrolls(
        rows.filter(
          (row) =>
            row.status === PayrollStatus.Draft ||
            row.status === PayrollStatus.Processing ||
            row.status === PayrollStatus.Processed ||
            row.status === PayrollStatus.Finalizing
        )
      );
    } catch (error) {
      console.error("Failed to load payrolls", error);
      setOrgInfo(null);
      setPayBatchCodes([]);
      setActivePayrolls([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    refreshData(slug);
  }, [slug, provider, payrollManagerAddress, account, version]);

  async function handleCreatePayroll(payBatchCode: string | null) {
    if (!chainId || !isAdmin || !slug.trim() || creatingPayroll) return;

    const startTime = localDateStartUnix(startDateInput);
    const endTime = localDateEndUnix(endDateInput);

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime <= 0 || endTime <= 0) {
      throw new Error("Start and end date must be valid");
    }
    if (endTime <= startTime) {
      throw new Error("End time must be greater than start time");
    }

    setCreatingPayroll(true);
    try {
      await createPayrollTx(chainId, slug.trim(), startTime, endTime, payBatchCode);
    } finally {
      setCreatingPayroll(false);
    }
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 920, alignSelf: "center" }}>
          <CardContent>
            <Stack gap="md">
              <PayrollNavigation slug={slug} active="payrolls" title="Payrolls" />

              {!slug && <Text.Body color="warn">Missing organization slug in route.</Text.Body>}

              {slug && (
                <Text.Body color="muted">
                  Organization: <strong>{slug}</strong>
                </Text.Body>
              )}

              {loading && <Text.Body color="muted">Loading payrolls...</Text.Body>}

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
                  <Text.Body size="sm" color="muted">
                    Payrolls: {activePayrolls.length}
                  </Text.Body>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {orgInfo?.exists && (
          <Card style={{ width: "100%", maxWidth: 920, alignSelf: "center" }}>
            <CardContent>
              <Stack gap="md">
                <Text.Label>Start New Payroll</Text.Label>
                <Text.Body size="sm" color="muted">
                  Choose a pay batch template for payroll creation. Default is {DEFAULT_PAY_BATCH_LABEL}.
                </Text.Body>

                <Stack>
                  <Text.Body size="sm" color="muted">Pay Batch Template</Text.Body>
                  <Select<string>
                    value={selectedBatchCode}
                    onChange={(value) => setSelectedBatchCode(value ? String(value) : null)}
                    disabled={!isAdmin}
                  >
                    {payBatchCodes.map((code) => (
                      <SelectOption
                        key={code}
                        value={code}
                        label={parseBatchCodeLabel(code)}
                      />
                    ))}
                  </Select>
                  <Text.Body size="xs" color="muted">
                    Pay batch is an internal bytes32 identifier. The friendly label is shown above.
                  </Text.Body>
                </Stack>

                <Stack>
                  <Text.Body size="sm" color="muted">Payroll Window</Text.Body>
                  <Select<PayrollWindowPreset>
                    value={windowPreset}
                    onChange={(value) => setWindowPreset((value as PayrollWindowPreset) ?? PayrollWindowPreset.Weekly)}
                    disabled={!isAdmin}
                  >
                    <SelectOption value={PayrollWindowPreset.Weekly} label="Weekly (7 days)" />
                    <SelectOption value={PayrollWindowPreset.Biweekly} label="Biweekly (14 days)" />
                    <SelectOption value={PayrollWindowPreset.Monthly} label="Monthly (30 days)" />
                    <SelectOption value={PayrollWindowPreset.Custom} label="Custom" />
                  </Select>
                </Stack>

                <Row gap="sm" wrap align="end">
                  <Stack style={{ flex: 1, minWidth: 220 }}>
                    <Text.Body size="sm" color="muted">Start Date</Text.Body>
                    <Input
                      type="date"
                      value={startDateInput}
                      onChange={(e) => setStartDateInput((e.target as HTMLInputElement).value)}
                      disabled={!isAdmin}
                    />
                  </Stack>

                  <Stack style={{ flex: 1, minWidth: 220 }}>
                    <Text.Body size="sm" color="muted">End Date</Text.Body>
                    <Input
                      type="date"
                      value={endDateInput}
                      onChange={(e) => setEndDateInput((e.target as HTMLInputElement).value)}
                      disabled={!isAdmin || windowPreset !== PayrollWindowPreset.Custom}
                    />
                  </Stack>
                </Row>

                <Row justify="end">
                  <ButtonSecondary
                    style={{ flex: 0 }}
                    onClick={() => handleCreatePayroll(null)}
                    disabled={!isAdmin || !slug || creatingPayroll}
                  >
                    {creatingPayroll ? "Starting..." : "Create Empty Payroll"}
                  </ButtonSecondary>
                  <ButtonPrimary
                    style={{ flex: 0 }}
                    onClick={() => handleCreatePayroll(selectedBatchCode)}
                    disabled={!isAdmin || !slug || creatingPayroll || !selectedBatchCode}
                  >
                    {creatingPayroll ? "Starting..." : "Start Payroll"}
                  </ButtonPrimary>
                </Row>
              </Stack>
            </CardContent>
          </Card>
        )}

        {orgInfo?.exists && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Stack gap="md">
                <Text.Label>Payrolls</Text.Label>
                {activePayrolls.length === 0 ? (
                  <Text.Body color="muted">No payrolls found.</Text.Body>
                ) : (
                  <Stack gap="sm">
                    {activePayrolls.map((row) => (
                      <Card key={row.payrollId} style={{ border: "1px solid var(--colors-border)" }}>
                        <CardContent>
                          <Stack gap="xs">
                            <Row justify="between" align="center" wrap>
                              <Text.Body weight={600}>Payroll #{row.payrollId}</Text.Body>
                              <Text.Body color={payrollStatusColor(row.status)} size="sm">
                                {payrollStatusLabel(row.status)}
                              </Text.Body>
                            </Row>
                            <Text.Body size="sm" color="muted">
                              Batch: {parseBatchCodeLabel(row.templateCode)}
                            </Text.Body>
                            <Text.Body size="sm" color="muted">
                              Window: {formatDateTime(row.startTime)} → {formatDateTime(row.endTime)}
                            </Text.Body>
                            <Text.Body size="sm" color="muted">
                              Nodes: {row.totalNodes} · Processing Remaining: {row.processingRemaining} · Finalization Remaining: {row.finalizationRemaining}
                            </Text.Body>
                            <Row justify="end">
                              <ButtonSecondary
                                style={{ flex: 0 }}
                                onClick={() => navigate(ROUTES.PAYROLL_DETAIL(slug, row.payrollId))}
                              >
                                Open
                              </ButtonSecondary>
                            </Row>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
}
