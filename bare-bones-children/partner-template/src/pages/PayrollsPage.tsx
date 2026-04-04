import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../components/Button/ButtonPrimary";
import { Select, SelectOption } from "../components/Select";
import { PaymentsNavBar } from "../components/Payments/PaymentsNavBar";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel } from "../models/payments";
import { fetchPayBatchCodes } from "../utils/payroll/fetchPayBatchViews";
import { ROUTES } from "../routes";

type PayrollWindowPreset = "weekly" | "biweekly" | "monthly" | "custom";

interface PayrollRunRow {
  payrollId: number;
  status: number;
  templateCode: string;
  startTime: number;
  endTime: number;
  totalNodes: number;
  processingRemaining: number;
  finalizationRemaining: number;
}

function payrollStatusLabel(status: number) {
  if (status === 1) return "Draft";
  if (status === 2) return "Processed";
  if (status === 3) return "Finalizing";
  if (status === 4) return "Finalized";
  if (status === 5) return "Cancelled";
  return "None";
}

function payrollStatusColor(status: number): "main" | "secondary" | "label" | "muted" | "danger" | "warn" | "success" {
  if (status === 1) return "warn";
  if (status === 2) return "secondary";
  if (status === 3) return "warn";
  if (status === 4) return "success";
  if (status === 5) return "danger";
  return "muted";
}

function parseBatchCodeLabel(value: string) {
  if (!value || value === ethers.constants.HashZero) {
    return "Manual / Empty";
  }
  try {
    return ethers.utils.parseBytes32String(value);
  } catch {
    return `${value.slice(0, 10)}…${value.slice(-8)}`;
  }
}

function formatDateTime(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) return "-";
  return `${new Date(ts * 1000).toLocaleString()} (${ts})`;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateValue(value: string, days: number) {
  const base = new Date(`${value}T00:00:00`);
  if (Number.isNaN(base.getTime())) return value;
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return formatDateInputValue(next);
}

function localDateStartUnix(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return Math.floor(date.getTime() / 1000);
}

function localDateEndUnix(dateValue: string) {
  const date = new Date(`${dateValue}T23:59:59`);
  return Math.floor(date.getTime() / 1000);
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
  const [activePayrolls, setActivePayrolls] = useState<PayrollRunRow[]>([]);

  const today = useMemo(() => new Date(), []);
  const [windowPreset, setWindowPreset] = useState<PayrollWindowPreset>("weekly");
  const [startDateInput, setStartDateInput] = useState<string>(formatDateInputValue(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)));
  const [endDateInput, setEndDateInput] = useState<string>(formatDateInputValue(today));
  const [selectedBatchCode, setSelectedBatchCode] = useState<string | null>(null);

  useEffect(() => {
    if (windowPreset === "custom") return;
    const windowDays = windowPreset === "weekly" ? 7 : windowPreset === "biweekly" ? 14 : 30;
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
        : iface.encodeFunctionData("createEmptyPayroll", [slugBytes, startTime, endTime]);

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

      if (selectedBatchCode && !codes.includes(selectedBatchCode)) {
        setSelectedBatchCode(null);
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

          return {
            payrollId,
            status: Number(run.status ?? run[0] ?? 0),
            templateCode: String(run.templateCode ?? run[1] ?? ethers.constants.HashZero),
            startTime: Number((run.startTime ?? run[2] ?? 0).toString()),
            endTime: Number((run.endTime ?? run[3] ?? 0).toString()),
            totalNodes: Number((progress.totalNodes ?? progress[0] ?? 0).toString()),
            processingRemaining: Number((progress.processingRemaining ?? progress[1] ?? 0).toString()),
            finalizationRemaining: Number((progress.finalizationRemaining ?? progress[2] ?? 0).toString()),
          } as PayrollRunRow;
        })
      );

      setActivePayrolls(rows.filter((row) => row.status === 1 || row.status === 2 || row.status === 3));
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

  async function handleCreatePayroll() {
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
      await createPayrollTx(chainId, slug.trim(), startTime, endTime, selectedBatchCode);
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
              <Text.Title align="left">Payrolls</Text.Title>
              <PaymentsNavBar slug={slug} active="payrolls" />

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
                    Active payrolls: {activePayrolls.length}
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
                  Choose a pay batch template for standard payroll creation, or leave it empty to create a manual payroll.
                </Text.Body>

                <Stack>
                  <Text.Body size="sm" color="muted">Pay Batch Template (optional)</Text.Body>
                  <Select<string>
                    value={selectedBatchCode}
                    onChange={(value) => setSelectedBatchCode(value ? String(value) : null)}
                    disabled={!isAdmin}
                  >
                    <SelectOption value="" label="No batch (create empty payroll)" />
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
                    onChange={(value) => setWindowPreset((value as PayrollWindowPreset) ?? "weekly")}
                    disabled={!isAdmin}
                  >
                    <SelectOption value="weekly" label="Weekly (7 days)" />
                    <SelectOption value="biweekly" label="Biweekly (14 days)" />
                    <SelectOption value="monthly" label="Monthly (30 days)" />
                    <SelectOption value="custom" label="Custom" />
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
                      disabled={!isAdmin || windowPreset !== "custom"}
                    />
                  </Stack>
                </Row>

                <Row justify="end">
                  <ButtonPrimary
                    style={{ flex: 0 }}
                    onClick={handleCreatePayroll}
                    disabled={!isAdmin || !slug || creatingPayroll}
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
                <Text.Label>Active Payrolls</Text.Label>
                {activePayrolls.length === 0 ? (
                  <Text.Body color="muted">No active payrolls found.</Text.Body>
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
                                Open Payroll Details
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
