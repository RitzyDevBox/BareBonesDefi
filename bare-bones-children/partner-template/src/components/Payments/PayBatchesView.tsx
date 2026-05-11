import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useReadProvider } from "../../hooks/useReadProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { DEFAULT_CHAIN_ID, getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel, PayeeModel } from "../../models/payments";
import { fetchPayeesByOrganization } from "../../utils/payroll/fetchPayeesByOrganization";
import {
  fetchOrganizationEarningsCodes,
  type OrganizationEarningsCodeView,
  type PayeeDefaultsView,
} from "../../utils/payroll/fetchPayrollViews";
import { fetchPayBatchCodes, fetchPayBatchPayeesWithDefaults } from "../../utils/payroll/fetchPayBatchViews";
import {
  parseBatchCodeLabel,
  parsePayeeNameLabel,
} from "../../utils/payroll/payrollFormatters";
import { shortAddress } from "../../utils/formatUtils";
import { orgSlugFor } from "../../utils/payroll/orgSlug";
import {
  PayrollEarningsStagingSection,
  PayrollConfigActionKind,
  type PayrollConfigActionPayload,
} from "../PayrollStagingManager";

function formatBatchCodeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Pay batch code is required");
  if (trimmed.startsWith("0x")) {
    if (trimmed.length !== 66) throw new Error("Hex batch code must be a bytes32 value");
    return trimmed;
  }
  return ethers.utils.formatBytes32String(trimmed);
}

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

interface PayBatchesViewProps {
  slug: string;
  isAdmin: boolean;
}

export function PayBatchesView({ slug, isAdmin }: PayBatchesViewProps) {
  const { account, chainId } = useWalletProvider();
  const provider = useReadProvider();
  const { version } = useTxRefresh();

  const [loading, setLoading] = useState(false);
  const [loadingBatchRows, setLoadingBatchRows] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [orgInfo, setOrgInfo] = useState<OrganizationModel | null>(null);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);
  const [selectedBatchCode, setSelectedBatchCode] = useState<string | null>(null);
  const [newBatchCode, setNewBatchCode] = useState("");

  const [payees, setPayees] = useState<PayeeModel[]>([]);
  const [earningsCodes, setEarningsCodes] = useState<OrganizationEarningsCodeView[]>([]);
  const [batchRows, setBatchRows] = useState<PayeeDefaultsView[]>([]);

  const chainIdOrDefault = chainId ?? DEFAULT_CHAIN_ID;
  const config = useMemo(() => getBareBonesConfiguration(chainIdOrDefault), [chainIdOrDefault]);
  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  const batchPayeeIds = useMemo(
    () => new Set(batchRows.map((row) => row.payeeId.toString())),
    [batchRows],
  );
  const batchRowByPayeeId = useMemo(
    () => new Map(batchRows.map((row) => [row.payeeId.toString(), row] as const)),
    [batchRows],
  );

  async function refreshData(orgSlug: string, nextBatchCode?: string | null) {
    if (!provider || !payrollManagerAddress) return;

    setLoading(true);
    setOrgInfo(null);
    setPayees([]);
    setEarningsCodes([]);
    setBatchRows([]);
    try {
      const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const slugBytes = orgSlugFor(orgSlug);
      const org = await contract.organizations(slugBytes);
      setOrgInfo({ owner: org.owner, exists: org.exists });
      if (!org.exists) {
        setBatchCodes([]);
        setBatchRows([]);
        setSelectedBatchCode(null);
        return;
      }
      const [payeeList, earningsCatalog, codes] = await Promise.all([
        // chainId is the new source-of-truth arg for the unified roster.
        // The provider + payrollManagerAddress are kept for sig back-compat.
        fetchPayeesByOrganization(provider, payrollManagerAddress, slugBytes, chainIdOrDefault),
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
          account ?? undefined,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, provider, payrollManagerAddress, account, version]);

  useEffect(() => {
    if (!selectedBatchCode || !slug || !provider || !payrollManagerAddress) return;
    setLoadingBatchRows(true);
    fetchPayBatchPayeesWithDefaults(
      provider,
      payrollManagerAddress,
      slug,
      selectedBatchCode,
      undefined,
      account ?? undefined,
    )
      .then(setBatchRows)
      .catch((error) => {
        console.error("Failed loading selected pay batch", error);
        setBatchRows([]);
      })
      .finally(() => setLoadingBatchRows(false));
  }, [selectedBatchCode]);

  const createPayBatch = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCodeRaw: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = orgSlugFor(orgSlug);
      const payBatchCode = formatBatchCodeInput(payBatchCodeRaw);
      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("createPayBatch", [slugBytes, payBatchCode]),
      } as any;
    },
    (_: number, __: string, payBatchCodeRaw: string) => `Created pay batch ${payBatchCodeRaw}`,
  );

  const configurePayBatch = useExecuteRawTx(
    (_: number, orgSlug: string, payBatchCode: string, actions: PayrollConfigActionPayload[]) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      if (!actions || !Array.isArray(actions) || actions.length === 0) {
        throw new Error("No actions to apply");
      }
      const slugBytes = orgSlugFor(orgSlug);
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
        data: iface.encodeFunctionData(
          "configurePayBatch(bytes32,bytes32,(uint8,uint256,(uint256,uint256,bytes)[],uint256[])[])",
          [slugBytes, payBatchCode, txActions],
        ),
      } as any;
    },
    (_: number, __: string, payBatchCode: string, actions: PayrollConfigActionPayload[]) =>
      `Configured ${actions.length} staged action(s) for ${parseBatchCodeLabel(payBatchCode)}`,
  );

  async function handleCreatePayBatch() {
    if (!chainId || !slug || !newBatchCode.trim() || creatingBatch) return;
    setCreatingBatch(true);
    try {
      await createPayBatch(chainId, slug, newBatchCode.trim());
      const nextCode = formatBatchCodeInput(newBatchCode.trim());
      setNewBatchCode("");
      await refreshData(slug, nextCode);
    } finally {
      setCreatingBatch(false);
    }
  }

  const memberCount = batchRows.length;
  const candidateCount = payees.filter((p) => !batchPayeeIds.has(p.payeeId.toString())).length;

  return (
    <>
      <div className="bb-pb-bar">
        <div className="bb-pb-bar-l">
          <label className="bb-kicker">Selected batch</label>
          <select
            className="bb-input"
            value={selectedBatchCode ?? ""}
            onChange={(e) => setSelectedBatchCode(e.target.value || null)}
            disabled={batchCodes.length === 0 || loading}
          >
            {batchCodes.length === 0 && <option value="">No batches yet</option>}
            {batchCodes.map((code) => (
              <option key={code} value={code}>
                {parseBatchCodeLabel(code)}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div className="bb-pb-bar-r">
            <input
              className="bb-input bb-input-sm bb-pb-create-in"
              placeholder="New pay batch name…"
              value={newBatchCode}
              onChange={(e) => setNewBatchCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newBatchCode.trim()) void handleCreatePayBatch();
              }}
              disabled={creatingBatch}
            />
            <button
              className="bb-btn-primary"
              disabled={!newBatchCode.trim() || !chainId || creatingBatch}
              onClick={() => void handleCreatePayBatch()}
            >
              {creatingBatch ? <span className="bb-spinner bb-sm" /> : "+"}
              Create batch
            </button>
          </div>
        )}
      </div>

      <div className="bb-pb-meta">
        <div>
          <div className="bb-kicker">Selected</div>
          <div className="bb-pb-meta-v">
            {selectedBatchCode ? parseBatchCodeLabel(selectedBatchCode) : "—"}
          </div>
        </div>
        <div>
          <div className="bb-kicker">Members</div>
          <div className="bb-pb-meta-v">{memberCount}</div>
        </div>
        <div>
          <div className="bb-kicker">Candidates</div>
          <div className="bb-pb-meta-v">{candidateCount}</div>
        </div>
        <div className="bb-pb-meta-note">
          <div className="bb-kicker">Earnings catalog</div>
          <div className="bb-pb-meta-v bb-small bb-muted">
            {earningsCodes.length} code{earningsCodes.length === 1 ? "" : "s"} registered
          </div>
        </div>
      </div>

      {loading && (
        <div className="bb-empty" style={{ padding: 24, marginBottom: 14 }}>
          <span className="bb-spinner" /> Loading pay batch data…
        </div>
      )}

      {!loading && (selectedBatchCode != null || orgInfo?.exists) && (
        <div
          style={{
            border: "1px solid var(--bb-line)",
            borderRadius: 14,
            background: "var(--bb-bg-elev)",
            padding: 16,
          }}
        >
          <PayrollEarningsStagingSection
            loading={loadingBatchRows}
            payees={payees}
            baseIncludedPayeeIds={batchPayeeIds}
            canEdit={isAdmin}
            formatAddPayeeLabel={(payee) =>
              `${parsePayeeNameLabel(payee.nameSlug)} · ${shortAddress(payee.paymentAddress)}`
            }
            addableEmptyMessage="All organization payees are already in this pay batch."
            panelTitle="Batch default earnings"
            panelAddLabel="Add default earning"
            getOnChainEarnings={(payee) => {
              const row = batchRowByPayeeId.get(payee.payeeId.toString());
              return row?.earnings ?? [];
            }}
            earningsCodes={earningsCodes}
            config={config}
            onSave={async (actions) => {
              if (!chainId || !slug || !selectedBatchCode) return false;
              const tx = await configurePayBatch(chainId, slug, selectedBatchCode, actions);
              return tx !== undefined;
            }}
            onAfterApply={async () => {
              await refreshData(slug, selectedBatchCode);
            }}
            disableApply={!isAdmin || !chainId || !selectedBatchCode || loadingBatchRows}
          />
        </div>
      )}
    </>
  );
}
