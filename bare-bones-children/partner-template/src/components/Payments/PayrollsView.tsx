import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useReadProvider } from "../../hooks/useReadProvider";
import { usePayrollActions } from "../../hooks/payroll/usePayrollActions";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { DEFAULT_CHAIN_ID, getBareBonesConfiguration } from "../../constants/misc";
import {
  DEFAULT_PAY_BATCH_LABEL,
  DEFAULT_PAY_BATCH_CODE,
  PAYROLL_WINDOW_DAYS,
  PayrollStatus,
  PayrollWindowPreset,
} from "../../constants/payroll";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import { fetchPayBatchCodes } from "../../utils/payroll/fetchPayBatchViews";
import {
  formatDateInputValue,
  formatDateTime,
  localDateStartUnix,
  parseBatchCodeLabel,
  parsePayrollRunRow,
  shiftDateValue,
  type PayrollRunRowView,
} from "../../utils/payroll/payrollFormatters";
import { ROUTES } from "../../routes";
import { orgSlugFor } from "../../utils/payroll/orgSlug";

interface PayrollsViewProps {
  slug: string;
  isAdmin: boolean;
}

type Tone = "draft" | "info" | "warn" | "ok" | "error";

function statusTone(status: number): Tone {
  if (status === PayrollStatus.Draft) return "draft";
  if (status === PayrollStatus.Processing) return "info";
  if (status === PayrollStatus.Processed) return "info";
  if (status === PayrollStatus.Finalizing) return "warn";
  if (status === PayrollStatus.Finalized) return "ok";
  if (status === PayrollStatus.Cancelled) return "error";
  return "draft";
}

function statusToneLabel(status: number): string {
  if (status === PayrollStatus.Draft) return "Draft";
  if (status === PayrollStatus.Processing) return "Processing";
  if (status === PayrollStatus.Processed) return "Processed";
  if (status === PayrollStatus.Finalizing) return "Finalizing";
  if (status === PayrollStatus.Finalized) return "Finalized";
  if (status === PayrollStatus.Cancelled) return "Cancelled";
  return "—";
}

function isOpenStatus(status: number): boolean {
  return (
    status === PayrollStatus.Draft ||
    status === PayrollStatus.Processing ||
    status === PayrollStatus.Processed ||
    status === PayrollStatus.Finalizing
  );
}

function CreateCard({
  isAdmin,
  slug,
  payBatchCodes,
  selectedBatchCode,
  setSelectedBatchCode,
  windowPreset,
  setWindowPreset,
  startDateInput,
  setStartDateInput,
  endDateInput,
  setEndDateInput,
  creating,
  createMode,
  error,
  onCreate,
}: {
  isAdmin: boolean;
  slug: string;
  payBatchCodes: string[];
  selectedBatchCode: string | null;
  setSelectedBatchCode: (v: string | null) => void;
  windowPreset: PayrollWindowPreset;
  setWindowPreset: (p: PayrollWindowPreset) => void;
  startDateInput: string;
  setStartDateInput: (v: string) => void;
  endDateInput: string;
  setEndDateInput: (v: string) => void;
  creating: boolean;
  createMode: "empty" | "batch" | null;
  error: string | null;
  onCreate: (batchCode: string | null, mode: "empty" | "batch") => void;
}) {
  const batchOptions = useMemo(() => {
    if (payBatchCodes.includes(DEFAULT_PAY_BATCH_CODE)) return payBatchCodes;
    return [DEFAULT_PAY_BATCH_CODE, ...payBatchCodes];
  }, [payBatchCodes]);

  return (
    <div
      style={{
        border: "1px solid var(--bb-line)",
        borderRadius: 14,
        background: "var(--bb-bg-elev)",
        padding: 22,
        marginBottom: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
          Start a new payroll
        </h3>
        <span className="bb-muted bb-small">Default template: {DEFAULT_PAY_BATCH_LABEL}</span>
      </div>

      <div className="bb-field-grid">
        <div className="bb-field">
          <label>Pay Batch Template</label>
          <select
            className="bb-input"
            value={selectedBatchCode ?? ""}
            onChange={(e) => setSelectedBatchCode(e.target.value || null)}
            disabled={!isAdmin}
          >
            {batchOptions.map((code) => (
              <option key={code} value={code}>
                {parseBatchCodeLabel(code)}
              </option>
            ))}
          </select>
        </div>

        <div className="bb-field">
          <label>Payroll Window</label>
          <select
            className="bb-input"
            value={windowPreset}
            onChange={(e) => setWindowPreset((e.target.value as PayrollWindowPreset) ?? PayrollWindowPreset.Weekly)}
            disabled={!isAdmin}
          >
            <option value={PayrollWindowPreset.Weekly}>Weekly (7 days)</option>
            <option value={PayrollWindowPreset.Biweekly}>Biweekly (14 days)</option>
            <option value={PayrollWindowPreset.Monthly}>Monthly (30 days)</option>
            <option value={PayrollWindowPreset.Custom}>Custom</option>
          </select>
        </div>

        <div className="bb-field">
          <label>Start date</label>
          <input
            className="bb-input"
            type="date"
            value={startDateInput}
            onChange={(e) => setStartDateInput(e.target.value)}
            disabled={!isAdmin}
          />
        </div>

        <div className="bb-field">
          <label>End date</label>
          <input
            className="bb-input"
            type="date"
            value={endDateInput}
            onChange={(e) => setEndDateInput(e.target.value)}
            disabled={!isAdmin || windowPreset !== PayrollWindowPreset.Custom}
          />
        </div>
      </div>

      {error && (
        <div className="bb-banner bb-banner-warn" style={{ marginTop: 12 }}>
          <span>⚠</span>
          <div>{error}</div>
          <span />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
        <button
          data-testid="payrolls-create-empty-btn"
          className="bb-btn-ghost"
          onClick={() => onCreate(null, "empty")}
          disabled={!isAdmin || !slug || creating}
        >
          {creating && createMode === "empty" ? <span className="bb-spinner bb-sm" /> : null}
          Create empty
        </button>
        <button
          data-testid="payrolls-start-payroll-btn"
          className="bb-btn-primary"
          onClick={() => onCreate(selectedBatchCode, "batch")}
          disabled={!isAdmin || !slug || creating || !selectedBatchCode}
        >
          {creating && createMode === "batch" ? <span className="bb-spinner bb-sm" /> : null}
          Start payroll
        </button>
      </div>
    </div>
  );
}

export function PayrollsView({ slug, isAdmin }: PayrollsViewProps) {
  const navigate = useNavigate();
  const { account, chainId } = useWalletProvider();
  const provider = useReadProvider();
  const { version } = useTxRefresh();

  const [loading, setLoading] = useState(false);
  const [creatingPayroll, setCreatingPayroll] = useState(false);
  const [createPayrollError, setCreatePayrollError] = useState<string | null>(null);
  const [payrollCreateMode, setPayrollCreateMode] = useState<"empty" | "batch" | null>(null);
  const [orgExists, setOrgExists] = useState<boolean | null>(null);
  const [payBatchCodes, setPayBatchCodes] = useState<string[]>([]);
  const [allPayrolls, setAllPayrolls] = useState<PayrollRunRowView[]>([]);

  const today = useMemo(() => new Date(), []);
  const [windowPreset, setWindowPreset] = useState<PayrollWindowPreset>(PayrollWindowPreset.Weekly);
  const [startDateInput, setStartDateInput] = useState<string>(
    formatDateInputValue(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
  );
  const [endDateInput, setEndDateInput] = useState<string>(formatDateInputValue(today));
  const [selectedBatchCode, setSelectedBatchCode] = useState<string | null>(DEFAULT_PAY_BATCH_CODE);

  useEffect(() => {
    if (windowPreset === PayrollWindowPreset.Custom) return;
    const windowDays = PAYROLL_WINDOW_DAYS[windowPreset];
    setEndDateInput(shiftDateValue(startDateInput, windowDays - 1));
  }, [windowPreset, startDateInput]);

  useEffect(() => {
    if (createPayrollError) setCreatePayrollError(null);
  }, [startDateInput, endDateInput, windowPreset, selectedBatchCode]);

  const chainIdOrDefault = chainId ?? DEFAULT_CHAIN_ID;
  const config = useMemo(() => getBareBonesConfiguration(chainIdOrDefault), [chainIdOrDefault]);
  const payrollManagerAddress = config?.payrollManagerAddress;
  // Routed via MTA.execute so PayrollOperator + Admin + SuperAdmin all work,
  // not just the org owner. See [usePayrollActions](../../hooks/payroll/usePayrollActions.ts).
  const slugBytes = useMemo(() => (slug ? orgSlugFor(slug) : ""), [slug]);
  const payrollActions = usePayrollActions(slugBytes);

  useEffect(() => {
    let cancelled = false;
    if (!slug || !provider || !payrollManagerAddress) return;

    setLoading(true);
    setAllPayrolls([]);
    setPayBatchCodes([]);

    (async () => {
      try {
        const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
        const slugBytes = orgSlugFor(slug);
        const org = await manager.organizations(slugBytes);
        if (cancelled) return;

        setOrgExists(Boolean(org.exists));
        if (!org.exists) {
          setPayBatchCodes([]);
          setAllPayrolls([]);
          return;
        }

        const codes = await fetchPayBatchCodes(provider, payrollManagerAddress, slug, account ?? undefined);
        if (cancelled) return;
        setPayBatchCodes(codes);

        const hasDefaultBatch = codes.includes(DEFAULT_PAY_BATCH_CODE);
        setSelectedBatchCode((current) => {
          if (!current || !codes.includes(current)) {
            return hasDefaultBatch ? DEFAULT_PAY_BATCH_CODE : codes[0] ?? null;
          }
          return current;
        });

        const orgMap = await manager.slugToOrgInfoMap(slugBytes);
        const nextPayrollIdBn: ethers.BigNumber =
          orgMap.nextPayrollId ?? orgMap[0] ?? ethers.BigNumber.from(0);
        const nextPayrollId = nextPayrollIdBn.toNumber();

        if (nextPayrollId <= 0) {
          if (!cancelled) setAllPayrolls([]);
          return;
        }

        const ids = Array.from({ length: nextPayrollId }, (_, i) => nextPayrollId - 1 - i);
        const rows = await Promise.all(
          ids.map(async (payrollId) => {
            const run = await manager.slugToPayrollToRunMap(slugBytes, payrollId);
            const progress = await manager.getPayrollNodeProgress(slugBytes, payrollId);
            return parsePayrollRunRow(payrollId, run, progress);
          }),
        );
        if (!cancelled) setAllPayrolls(rows);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load payrolls", error);
          setOrgExists(null);
          setPayBatchCodes([]);
          setAllPayrolls([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, provider, payrollManagerAddress, account, version]);

  const openCycles = useMemo(() => allPayrolls.filter((r) => isOpenStatus(r.status)), [allPayrolls]);
  const historicCycles = useMemo(() => allPayrolls.filter((r) => !isOpenStatus(r.status)), [allPayrolls]);

  async function handleCreatePayroll(payBatchCode: string | null, mode: "empty" | "batch") {
    if (!chainId || !isAdmin || !slug.trim() || creatingPayroll) return;

    setCreatePayrollError(null);
    setPayrollCreateMode(mode);

    const startTime = localDateStartUnix(startDateInput);
    const endTime = localDateStartUnix(endDateInput) + 24 * 60 * 60;

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime <= 0 || endTime <= 0) {
      setCreatePayrollError("Start and end date must be valid.");
      setPayrollCreateMode(null);
      return;
    }
    if (endTime <= startTime) {
      setCreatePayrollError("End time must be greater than start time.");
      setPayrollCreateMode(null);
      return;
    }

    const periodSeconds = endTime - startTime;
    if (periodSeconds % 3600 !== 0) {
      setCreatePayrollError("Invalid payroll window: duration must align to full hours.");
      setPayrollCreateMode(null);
      return;
    }

    setCreatingPayroll(true);
    try {
      await payrollActions.createPayroll(
        payBatchCode ?? ethers.constants.HashZero,
        startTime,
        endTime,
      );
    } catch (err: any) {
      const message =
        err?.reason || err?.errorName || err?.error?.message || err?.message || "Failed to start payroll.";
      setCreatePayrollError(String(message));
    } finally {
      setCreatingPayroll(false);
      setPayrollCreateMode(null);
    }
  }

  return (
    <>
      {(isAdmin || orgExists === true) && (
        <CreateCard
          isAdmin={isAdmin}
          slug={slug}
          payBatchCodes={payBatchCodes}
          selectedBatchCode={selectedBatchCode}
          setSelectedBatchCode={setSelectedBatchCode}
          windowPreset={windowPreset}
          setWindowPreset={setWindowPreset}
          startDateInput={startDateInput}
          setStartDateInput={setStartDateInput}
          endDateInput={endDateInput}
          setEndDateInput={setEndDateInput}
          creating={creatingPayroll}
          createMode={payrollCreateMode}
          error={createPayrollError}
          onCreate={handleCreatePayroll}
        />
      )}

      {openCycles.length > 0 && (
        <div className="bb-prl-active">
          <div className="bb-prl-section-head">
            <span className="bb-kicker">Open cycles</span>
            <span className="bb-muted bb-small">Editable · click to manage</span>
          </div>
          <div className="bb-prl-active-grid">
            {openCycles.map((row) => {
              const tone = statusTone(row.status);
              return (
                <button
                  key={row.payrollId}
                  type="button"
                  data-testid={`payrolls-open-card-${row.payrollId}`}
                  className={`bb-prl-active-card bb-prl-tone-${tone}`}
                  onClick={() => navigate(ROUTES.PAYROLL_DETAIL(slug, row.payrollId))}
                >
                  <div className="bb-prl-active-top">
                    <div>
                      <div className="bb-prl-active-cycle">Payroll #{row.payrollId}</div>
                      <div className="bb-muted bb-small">
                        {formatDateTime(row.startTime)} → {formatDateTime(row.endTime)}
                      </div>
                    </div>
                    <span className={`bb-status bb-status-${tone}`}>{statusToneLabel(row.status)}</span>
                  </div>
                  <div className="bb-prl-active-meta">
                    <div>
                      <div className="bb-kicker">Batch</div>
                      <div className="bb-prl-active-v">{parseBatchCodeLabel(row.templateCode)}</div>
                    </div>
                    <div>
                      <div className="bb-kicker">Nodes</div>
                      <div className="bb-prl-active-v">{row.totalNodes}</div>
                    </div>
                    <div>
                      <div className="bb-kicker">Remaining</div>
                      <div className="bb-prl-active-v">
                        {Number(row.processingRemaining) + Number(row.finalizationRemaining)}
                      </div>
                    </div>
                  </div>
                  <div className="bb-prl-active-cta">
                    Manage cycle →
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bb-prl-section-head" style={{ marginTop: openCycles.length > 0 ? 28 : 0 }}>
        <span className="bb-kicker">Historic payrolls</span>
        <span className="bb-muted bb-small">
          {loading ? "loading…" : `${historicCycles.length} cycle${historicCycles.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="bb-prl-table" role="table" aria-label="Historic payrolls">
        <div className="bb-prl-head" role="row">
          <div className="bb-prl-cell">Cycle</div>
          <div className="bb-prl-cell">Window</div>
          <div className="bb-prl-cell">Nodes</div>
          <div className="bb-prl-cell">Done</div>
          <div className="bb-prl-cell">Batch</div>
          <div className="bb-prl-cell">Status</div>
          <div className="bb-prl-cell" aria-hidden />
        </div>
        {loading && (
          <div className="bb-prl-empty">
            <span className="bb-spinner" /> Loading payrolls…
          </div>
        )}
        {!loading && historicCycles.length === 0 && (
          <div className="bb-prl-empty">No historic payrolls yet.</div>
        )}
        {!loading &&
          historicCycles.map((row) => {
            const tone = statusTone(row.status);
            return (
              <button
                key={row.payrollId}
                type="button"
                data-testid={`payrolls-open-historic-${row.payrollId}`}
                className="bb-prl-row"
                onClick={() => navigate(ROUTES.PAYROLL_DETAIL(slug, row.payrollId))}
              >
                <div className="bb-prl-cell bb-prl-cell-cycle">
                  <span className="bb-prl-cell-cycle-name">Payroll #{row.payrollId}</span>
                </div>
                <div className="bb-prl-cell bb-prl-cell-window bb-mono bb-small bb-muted">
                  {formatDateTime(row.startTime)} → {formatDateTime(row.endTime)}
                </div>
                <div className="bb-prl-cell bb-prl-cell-payees bb-mono">{row.totalNodes}</div>
                <div className="bb-prl-cell bb-prl-cell-batches bb-mono">
                  {row.totalNodes - Number(row.processingRemaining) - Number(row.finalizationRemaining)}
                </div>
                <div className="bb-prl-cell bb-prl-cell-gross bb-mono bb-small">
                  {parseBatchCodeLabel(row.templateCode)}
                </div>
                <div className="bb-prl-cell bb-prl-cell-status">
                  <span className={`bb-status bb-status-${tone}`}>{statusToneLabel(row.status)}</span>
                </div>
                <div className="bb-prl-cell bb-prl-cell-go">→</div>
              </button>
            );
          })}
      </div>
    </>
  );
}
