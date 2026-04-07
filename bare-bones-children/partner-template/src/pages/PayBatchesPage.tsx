import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useParams } from "react-router-dom";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent, Input } from "../components/BasicComponents";
import { Stack, Row } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { ButtonSecondary } from "../components/Button/ButtonPrimary";

import { Select, SelectOption } from "../components/Select";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../constants/misc";
import PayrollManagerABI from "../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel, PayeeModel } from "../models/payments";
import { fetchPayeesByOrganization } from "../utils/payroll/fetchPayeesByOrganization";
import {
  fetchOrganizationEarningsCodes,
  type OrganizationEarningsCodeView,
  type PayeeDefaultsView,
} from "../utils/payroll/fetchPayrollViews";
import { fetchPayBatchCodes, fetchPayBatchPayeesWithDefaults } from "../utils/payroll/fetchPayBatchViews";
import { PayrollNavigation } from "../components/PayrollNavigation";
import {
  parseBatchCodeLabel,
  parsePayeeNameLabel,
} from "../utils/payroll/payrollFormatters";
import {
  PayrollEarningsStagingSection,
  PayrollConfigActionKind,
  type PayrollConfigActionPayload,
} from "../components/PayrollStagingManager";

function formatBatchCodeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Pay batch code is required");
  if (trimmed.startsWith("0x")) {
    if (trimmed.length !== 66) {
      throw new Error("Hex batch code must be a bytes32 value");
    }
    return trimmed;
  }
  return ethers.utils.formatBytes32String(trimmed);
}

export function PayBatchesPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const slug = (organizationId ?? "").trim();

  const { account, provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();

  const [loading, setLoading] = useState(false);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);
  const [selectedBatchCode, setSelectedBatchCode] = useState<string | null>(null);
  const [newBatchCode, setNewBatchCode] = useState("");

  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [earningsCodes, setEarningsCodes] = useState<OrganizationEarningsCodeView[]>([]);
  const [batchRows, setBatchRows] = useState<PayeeDefaultsView[]>([]);

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  const earningsCodeById = useMemo(
    () => new Map(earningsCodes.map((code) => [code.earningsCodeId.toString(), code] as const)),
    [earningsCodes]
  );

  const activeEarningsCodes = useMemo(
    () =>
      earningsCodes.filter((code) => {
        if (!code.isActive) return false;
        if (!config?.weeklyScheduleRuleAddress) return true;
        return code.rule.toLowerCase() !== config.weeklyScheduleRuleAddress.toLowerCase();
      }),
    [earningsCodes, config]
  );

  const batchPayeeIds = useMemo(
    () => new Set(batchRows.map((row) => row.payeeId.toString())),
    [batchRows]
  );

  const batchRowByPayeeId = useMemo(
    () => new Map(batchRows.map((row) => [row.payeeId.toString(), row] as const)),
    [batchRows]
  );

  function normalizeConfigureActions(actions: PayrollConfigActionPayload[]): PayrollConfigActionPayload[] {
    const byPayee = new Map<
      string,
      {
        payeeId: ethers.BigNumberish;
        removeAll: boolean;
        includeEmptyUpsert: boolean;
        upserts: Map<string, { rate: ethers.BigNumberish; runData: string }>;
        removeCodes: Set<string>;
      }
    >();

    for (const action of actions) {
      const payeeId = action.payeeId.toString();
      if (!byPayee.has(payeeId)) {
        byPayee.set(payeeId, {
          payeeId: action.payeeId,
          removeAll: false,
          includeEmptyUpsert: false,
          upserts: new Map(),
          removeCodes: new Set(),
        });
      }

      const state = byPayee.get(payeeId)!;

      if (action.action === PayrollConfigActionKind.Remove) {
        if (action.earningsCodeIds.length === 0) {
          state.removeAll = true;
          state.includeEmptyUpsert = false;
          state.upserts.clear();
          state.removeCodes.clear();
          continue;
        }

        if (state.removeAll) continue;

        for (const codeIdRaw of action.earningsCodeIds) {
          const codeId = codeIdRaw.toString();
          state.upserts.delete(codeId);
          state.removeCodes.add(codeId);
        }
        continue;
      }

      if (state.removeAll) continue;

      if (action.earningsCodeIds.length === 0) {
        state.includeEmptyUpsert = true;
        continue;
      }

      for (let i = 0; i < action.earningsCodeIds.length; i++) {
        const codeId = action.earningsCodeIds[i].toString();
        state.removeCodes.delete(codeId);
        state.upserts.set(codeId, {
          rate: action.rates[i] ?? ethers.BigNumber.from(0),
          runData: action.runData[i] ?? "0x",
        });
      }
    }

    const normalized: PayrollConfigActionPayload[] = [];
    for (const state of byPayee.values()) {
      if (state.removeAll) {
        normalized.push({
          action: PayrollConfigActionKind.Remove,
          payeeId: state.payeeId,
          earningsCodeIds: [],
          rates: [],
          runData: [],
        });
        continue;
      }

      if (state.upserts.size > 0) {
        const entries = Array.from(state.upserts.entries());
        normalized.push({
          action: PayrollConfigActionKind.Upsert,
          payeeId: state.payeeId,
          earningsCodeIds: entries.map(([codeId]) => ethers.BigNumber.from(codeId)),
          rates: entries.map(([, value]) => value.rate),
          runData: entries.map(([, value]) => value.runData),
        });
      } else if (state.includeEmptyUpsert) {
        normalized.push({
          action: PayrollConfigActionKind.Upsert,
          payeeId: state.payeeId,
          earningsCodeIds: [],
          rates: [],
          runData: [],
        });
      }

      if (state.removeCodes.size > 0) {
        normalized.push({
          action: PayrollConfigActionKind.Remove,
          payeeId: state.payeeId,
          earningsCodeIds: Array.from(state.removeCodes).map((codeId) => ethers.BigNumber.from(codeId)),
          rates: [],
          runData: [],
        });
      }
    }

    return normalized;
  }


  async function refreshData(orgSlug: string, nextBatchCode?: string | null) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const org = await contract.organizations(slugBytes);

      setOrgInfo({ owner: org.owner, exists: org.exists });
      setIsAdmin(Boolean(org.exists && org.owner.toLowerCase() === account?.toLowerCase()));

      if (!org.exists) {
        setPayees([]);
        setEarningsCodes([]);
        setBatchCodes([]);
        setBatchRows([]);
        setSelectedBatchCode(null);
        return;
      }

      const [payeeList, earningsCatalog, codes] = await Promise.all([
        fetchPayeesByOrganization(provider, payrollManagerAddress, slugBytes),
        fetchOrganizationEarningsCodes(provider, payrollManagerAddress, orgSlug),
        fetchPayBatchCodes(provider, payrollManagerAddress, orgSlug, account ?? undefined),
      ]);

      setPayees(payeeList);
      setEarningsCodes(earningsCatalog);
      setBatchCodes(codes);

      const targetCode = nextBatchCode ?? selectedBatchCode ?? codes[0] ?? null;
      setSelectedBatchCode(targetCode);

      if (targetCode) {
        const rows = await fetchPayBatchPayeesWithDefaults(
          provider,
          payrollManagerAddress,
          orgSlug,
          targetCode,
          undefined,
          account ?? undefined
        );
        setBatchRows(rows);
      } else {
        setBatchRows([]);
      }
    } catch (error) {
      console.error("Failed to load pay batch data", error);
      setOrgInfo(null);
      setPayees([]);
      setEarningsCodes([]);
      setBatchCodes([]);
      setBatchRows([]);
      setSelectedBatchCode(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    refreshData(slug);
  }, [slug, provider, payrollManagerAddress, account, version]);

  useEffect(() => {
    if (!selectedBatchCode || !slug) return;
    if (!provider || !payrollManagerAddress) return;

    fetchPayBatchPayeesWithDefaults(
      provider,
      payrollManagerAddress,
      slug,
      selectedBatchCode,
      undefined,
      account ?? undefined
    )
      .then(setBatchRows)
      .catch((error) => {
        console.error("Failed loading selected pay batch", error);
        setBatchRows([]);
      });
  }, [selectedBatchCode]);

  const createPayBatch = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCodeRaw: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const payBatchCode = formatBatchCodeInput(payBatchCodeRaw);

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("createPayBatch", [slugBytes, payBatchCode]),
      } as any;
    },
    (_: number, __: string, payBatchCodeRaw: string) => `Created pay batch ${payBatchCodeRaw}`
  );

  const configurePayBatch = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCode: string, actions: PayrollConfigActionPayload[]) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      if (!actions || !Array.isArray(actions) || actions.length === 0) {
        throw new Error("No actions to apply");
      }
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const normalizedActions = normalizeConfigureActions(actions);

      const txActions = normalizedActions.map((action) => {
        const earningsCodeIds = action.earningsCodeIds.map((id) => ethers.BigNumber.from(id));
        const assignments =
          action.action === PayrollConfigActionKind.Upsert
            ? earningsCodeIds.map((earningsCodeId, idx) => ({
                earningsCodeId,
                rate: ethers.BigNumber.from(action.rates[idx] ?? 0),
                runData: action.runData[idx] ?? "0x",
              }))
            : [];

        return {
          action: action.action,
          payeeId: ethers.BigNumber.from(action.payeeId),
          assignments,
          earningsCodeIds,
        };
      });

      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("configurePayBatch(bytes32,bytes32,(uint8,uint256,(uint256,uint256,bytes)[],uint256[])[])", [slugBytes, payBatchCode, txActions]),
      } as any;
    },
    (_: number, __: string, payBatchCode: string, actions: PayrollConfigActionPayload[]) =>
      `Configured ${actions.length} staged action(s) for ${parseBatchCodeLabel(payBatchCode)}`
  );

  async function handleCreatePayBatch() {
    if (!chainId || !slug || !newBatchCode.trim()) return;
    await createPayBatch(chainId, slug, newBatchCode.trim());

    const nextCode = formatBatchCodeInput(newBatchCode.trim());
    setNewBatchCode("");
    await refreshData(slug, nextCode);
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card style={{ width: "100%", maxWidth: 980, alignSelf: "center" }}>
          <CardContent>
            <PayrollNavigation slug={slug} active="payBatches" title="Pay Batches" />

            {!slug && <Text.Body color="warn">Missing organization slug in route.</Text.Body>}
            {slug && (
              <Text.Body color="muted">
                Organization: <strong>{slug}</strong>
              </Text.Body>
            )}
            {loading && <Text.Body color="muted">Loading pay batch data...</Text.Body>}

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
                <Text.Body color="muted" size="sm">
                  Batch codes: {batchCodes.length} · Payees: {payees.length} · Active earnings codes: {activeEarningsCodes.length}
                </Text.Body>
              </Stack>
            )}

            <Row gap="sm" align="end" wrap>
              <Stack style={{ minWidth: 280, flex: 1 }}>
                <Text.Body size="sm" color="muted">Selected Pay Batch</Text.Body>
                <Select<string>
                  value={selectedBatchCode}
                  onChange={(value) => setSelectedBatchCode(String(value))}
                  disabled={batchCodes.length === 0}
                >
                  {batchCodes.map((code) => (
                      <SelectOption key={code} value={code} label={parseBatchCodeLabel(code)} />
                  ))}
                </Select>
              </Stack>

              {isAdmin && (
                <>
                  <Stack style={{ minWidth: 240, flex: 1 }}>
                    <Text.Body size="sm" color="muted">Create New Pay Batch</Text.Body>
                    <Input
                      value={newBatchCode}
                      onChange={(e) => setNewBatchCode(e.target.value)}
                      placeholder="OPS_BATCH"
                    />
                  </Stack>
                  <ButtonSecondary style={{ flex: 0 }} onClick={handleCreatePayBatch} disabled={!newBatchCode.trim() || !chainId}>
                    Create Batch
                  </ButtonSecondary>
                </>
              )}
            </Row>
          </CardContent>
        </Card>

        {selectedBatchCode && (
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Stack gap="md">
                <PayrollEarningsStagingSection
                  payees={payees}
                  baseIncludedPayeeIds={batchPayeeIds}
                  canEdit={isAdmin}
                  searchEnabled={true}
                  formatAddPayeeLabel={(payee) => `${parsePayeeNameLabel(payee.role)} · #${payee.payeeId.toString()}`}
                  addPayeeButtonLabel="+ Add Payee"
                  addableEmptyMessage="All organization payees are already in this pay batch."
                  panelTitle="Batch Default Earnings"
                  panelAddLabel="+ Add Default Earning"
                  getOnChainEarnings={(payee) => {
                    const row = batchRowByPayeeId.get(payee.payeeId.toString());
                    return (row?.earnings ?? []).filter((earning) => {
                      if (!config?.weeklyScheduleRuleAddress) return true;
                      return earning.rule.toLowerCase() !== config.weeklyScheduleRuleAddress.toLowerCase();
                    });
                  }}
                  earningsCodeById={earningsCodeById}
                  activeEarningsCodes={activeEarningsCodes}
                  config={config}
                  onSave={async (actions) => {
                    if (!chainId || !slug || !selectedBatchCode) return false;
                    const tx = await configurePayBatch(chainId, slug, selectedBatchCode, actions);
                    return tx !== undefined;
                  }}
                  onAfterApply={async () => {
                    await refreshData(slug, selectedBatchCode);
                  }}
                  disableApply={!isAdmin || !chainId || !selectedBatchCode}
                />
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
}
