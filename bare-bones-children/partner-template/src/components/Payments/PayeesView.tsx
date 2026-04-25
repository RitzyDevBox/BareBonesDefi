import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";
import { DEFAULT_PAY_BATCH_CODE, PayeeStatus } from "../../constants/payroll";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel, PayeeModel } from "../../models/payments";
import { shortAddress } from "../../utils/formatUtils";
import { parsePayeeNameLabel } from "../../utils/payroll/payrollFormatters";

interface PayeesViewProps {
  slug: string;
  orgInfo: OrganizationModel | null;
  payees: PayeeModel[];
  loading: boolean;
  isAdmin: boolean;
  onPayeesChanged: () => Promise<void> | void;
}

type PayeeStatusKey = "active" | "onhold" | "terminated";

function statusKeyFromCode(code: number): PayeeStatusKey {
  if (code === PayeeStatus.OnLeave) return "onhold";
  if (code === PayeeStatus.Inactive) return "terminated";
  return "active";
}

function statusCodeFromKey(key: PayeeStatusKey): number {
  if (key === "onhold") return PayeeStatus.OnLeave;
  if (key === "terminated") return PayeeStatus.Inactive;
  return PayeeStatus.Active;
}

function statusLabel(key: PayeeStatusKey): string {
  if (key === "onhold") return "On hold";
  if (key === "terminated") return "Terminated";
  return "Active";
}

function statusDotColor(key: PayeeStatusKey): string {
  if (key === "onhold") return "var(--bb-warn)";
  if (key === "terminated") return "var(--bb-error)";
  return "var(--bb-success)";
}

function PayeeStatusPill({ status }: { status: PayeeStatusKey }) {
  return (
    <span className={`bb-payee-status bb-payee-status-${status}`}>
      <span className="bb-payee-status-dot" style={{ background: statusDotColor(status) }} />
      {statusLabel(status)}
    </span>
  );
}

interface RowEditorProps {
  initial?: { name: string; address: string; statusKey: PayeeStatusKey };
  onCancel: () => void;
  onSubmit: (draft: { name: string; address: string; statusKey: PayeeStatusKey }) => void | Promise<void>;
  saving?: boolean;
  showStatus?: boolean;
}

function PayeeRowEditor({ initial, onCancel, onSubmit, saving = false, showStatus = true }: RowEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [statusKey, setStatusKey] = useState<PayeeStatusKey>(initial?.statusKey ?? "active");

  const valid = name.trim().length > 0 && /^0x[a-fA-F0-9]{40}$/.test(address.trim());

  return (
    <div className="bb-payees-row-edit" role="row">
      <div className="bb-payees-cell bb-payees-cell-name">
        <input
          className="bb-input bb-input-sm"
          placeholder="Payee name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          disabled={saving}
        />
      </div>
      <div className="bb-payees-cell">
        <input
          className="bb-input bb-input-sm bb-mono"
          placeholder="0x…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="bb-payees-cell">
        {showStatus ? (
          <select
            className="bb-input bb-input-sm"
            value={statusKey}
            onChange={(e) => setStatusKey(e.target.value as PayeeStatusKey)}
            disabled={saving}
          >
            <option value="active">Active</option>
            <option value="onhold">On hold</option>
            <option value="terminated">Terminated</option>
          </select>
        ) : null}
      </div>
      <div className="bb-payees-cell bb-payees-cell-actions">
        <button className="bb-btn-ghost bb-btn-xs" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          className="bb-btn-primary bb-btn-xs"
          disabled={!valid || saving}
          onClick={() => onSubmit({ name: name.trim(), address: address.trim(), statusKey })}
        >
          {saving ? <span className="bb-spinner bb-sm" /> : null}
          {initial ? "Save" : "Stage payee"}
        </button>
      </div>
    </div>
  );
}

interface BatchSheetProps {
  onClose: () => void;
  onSubmit: (rows: Array<{ name: string; address: string }>) => Promise<void>;
  submitting: boolean;
}

function BatchOnboardSheet({ onClose, onSubmit, submitting }: BatchSheetProps) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows: Array<{ address: string; name: string }> = [];
    for (const l of lines) {
      const parts = l.split(/[,\t]/).map((s) => s.trim());
      const addr = parts.find((p) => /^0x[a-fA-F0-9]{40}$/.test(p));
      if (!addr) continue;
      const rest = parts.filter((p) => p !== addr);
      rows.push({
        address: addr,
        name: rest[0] || `Payee ${shortAddress(addr)}`,
      });
    }
    return rows;
  }, [text]);

  return (
    <div
      className="bb-modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          (e.currentTarget as any).__scrimPress = true;
        }
      }}
      onMouseUp={(e) => {
        if ((e.currentTarget as any).__scrimPress && e.target === e.currentTarget) {
          onClose();
        }
        (e.currentTarget as any).__scrimPress = false;
      }}
    >
      <div className="bb-modal bb-modal-lg">
        <div className="bb-modal-head">
          <div>
            <div className="bb-modal-kicker">Batch onboarding</div>
            <h3>Add multiple payees</h3>
          </div>
          <button className="bb-icon-btn" onClick={onClose} aria-label="Close" disabled={submitting}>
            ✕
          </button>
        </div>
        <div className="bb-modal-body">
          <div className="bb-field bb-full">
            <label>Paste payees</label>
            <textarea
              className="bb-textarea bb-mono"
              rows={8}
              placeholder={"0xAddress, Name\n0xAddress\n0xAddress, Name"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
            />
            <div className="bb-field-hint">One per line · CSV or tab separated · Address required</div>
          </div>
          {parsed.length > 0 && (
            <div style={{ marginTop: 12, border: "1px solid var(--bb-line)", borderRadius: 10, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "var(--bb-bg-elev-2)",
                  borderBottom: "1px solid var(--bb-line)",
                  fontSize: 12.5,
                }}
              >
                <span>
                  {parsed.length} payee{parsed.length === 1 ? "" : "s"} ready to onboard
                </span>
                <span className="bb-muted bb-small">Will batch into one transaction</span>
              </div>
              {parsed.slice(0, 8).map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "200px 1fr",
                    padding: "8px 14px",
                    borderBottom: "1px solid var(--bb-line)",
                    gap: 10,
                    alignItems: "center",
                    fontSize: 13,
                  }}
                >
                  <span className="bb-mono bb-small">{shortAddress(r.address)}</span>
                  <span>{r.name}</span>
                </div>
              ))}
              {parsed.length > 8 && (
                <div style={{ padding: "8px 14px" }} className="bb-muted bb-small">
                  + {parsed.length - 8} more…
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bb-modal-foot">
          <button className="bb-btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="bb-btn-primary"
            disabled={parsed.length === 0 || submitting}
            onClick={() => void onSubmit(parsed)}
          >
            {submitting ? <span className="bb-spinner bb-sm" /> : null}
            Onboard {parsed.length || ""} payee{parsed.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PayeesView({ slug, orgInfo, payees, loading, isAdmin, onPayeesChanged }: PayeesViewProps) {
  const { chainId } = useWalletProvider();
  const config = useMemo(() => (chainId ? getBareBonesConfiguration(chainId) : null), [chainId]);
  const payrollManagerAddress = config?.payrollManagerAddress;
  const iface = useMemo(() => new ethers.utils.Interface(PayrollManagerABI as any), []);

  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  const onboardPayee = useExecuteRawTx(
    (_: number, orgSlug: string, name: string, paymentAddress: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const nameBytes = ethers.utils.formatBytes32String(name.trim());
      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("onboardPayee", [slugBytes, nameBytes, paymentAddress, "0x"]),
      } as any;
    },
    (_: number, __: string, name: string, paymentAddress: string) =>
      `Onboarded ${name} (${shortAddress(paymentAddress)})`,
  );

  const batchOnboardPayees = useExecuteRawTx(
    (_: number, orgSlug: string, entries: Array<{ name: string; address: string }>) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      if (!entries.length) throw new Error("No payees to onboard");
      const slugBytes = ethers.utils.formatBytes32String(orgSlug);
      const configs = entries.map((entry) => ({
        name: ethers.utils.formatBytes32String(entry.name.trim()),
        paymentAddress: entry.address.trim(),
        params: "0x",
        assignments: [],
      }));
      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("batchOnboardPayeesAndConfigurePayBatch", [
          slugBytes,
          DEFAULT_PAY_BATCH_CODE,
          configs,
        ]),
      } as any;
    },
    (_: number, __: string, entries: Array<{ name: string; address: string }>) =>
      `Onboarded ${entries.length} payee(s)`,
  );

  const updatePayee = useExecuteRawTx(
    (_: number, payee: PayeeModel, nextStatus: number, nextAddress: string) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("updatePayee", [
          payee.payeeId,
          payee.role,
          nextAddress,
          payee.params,
          nextStatus,
        ]),
      } as any;
    },
    (_: number, payee: PayeeModel) => `Updated payee ${payee.payeeId.toString()}`,
  );

  const enriched = useMemo(
    () =>
      payees.map((p) => ({
        ...p,
        idStr: p.payeeId.toString(),
        nameLabel: parsePayeeNameLabel(p.role),
        statusKey: statusKeyFromCode(Number(p.status ?? 0)),
      })),
    [payees],
  );

  const filtered = useMemo(() => {
    let rows = enriched;
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.nameLabel.toLowerCase().includes(q) ||
          r.paymentAddress.toLowerCase().includes(q) ||
          r.idStr.includes(q),
      );
    }
    return rows;
  }, [enriched, query]);

  async function handleAddSubmit(draft: { name: string; address: string; statusKey: PayeeStatusKey }) {
    if (!chainId || !slug) return;
    setOnboarding(true);
    try {
      await onboardPayee(chainId, slug, draft.name, draft.address);
      await onPayeesChanged();
      setAdding(false);
    } finally {
      setOnboarding(false);
    }
  }

  async function handleEditSubmit(payee: PayeeModel, draft: { name: string; address: string; statusKey: PayeeStatusKey }) {
    if (!chainId) return;
    setSavingId(payee.payeeId.toString());
    try {
      await updatePayee(chainId, payee, statusCodeFromKey(draft.statusKey), draft.address);
      await onPayeesChanged();
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  }

  async function handleBatchSubmit(rows: Array<{ name: string; address: string }>) {
    if (!chainId || !slug || rows.length === 0) return;
    setOnboarding(true);
    try {
      await batchOnboardPayees(chainId, slug, rows);
      await onPayeesChanged();
      setBatchOpen(false);
    } finally {
      setOnboarding(false);
    }
  }

  const editable = isAdmin && Boolean(orgInfo?.exists);

  return (
    <>
      <div className="bb-panel">
        <div className="bb-panel-toolbar">
          <div className="bb-panel-toolbar-r" style={{ marginLeft: "auto" }}>
            <div className="bb-search">
              <span aria-hidden style={{ fontSize: 13 }}>🔍</span>
              <input
                placeholder="Search payees, addresses, IDs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="bb-search-x" onClick={() => setQuery("")} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>
            <button
              className="bb-btn-ghost bb-btn-sm"
              onClick={() => setBatchOpen(true)}
              disabled={!editable || onboarding}
            >
              Batch onboard
            </button>
            <button
              className="bb-btn-primary bb-btn-sm"
              onClick={() => setAdding(true)}
              disabled={!editable || onboarding}
            >
              + Add payee
            </button>
          </div>
        </div>

        <div className="bb-payees-table" role="table" aria-label="Payees">
          <div className="bb-payees-head" role="row">
            <div className="bb-payees-cell">Payee</div>
            <div className="bb-payees-cell">Address</div>
            <div className="bb-payees-cell">Status</div>
            <div className="bb-payees-cell" aria-hidden />
          </div>

          {adding && (
            <PayeeRowEditor
              onCancel={() => setAdding(false)}
              onSubmit={handleAddSubmit}
              saving={onboarding}
              showStatus={false}
            />
          )}

          {!loading && filtered.length === 0 && !adding && (
            <div className="bb-payees-empty">
              {payees.length === 0
                ? "No payees yet. Add your first payee to get started."
                : "No payees match this filter."}
            </div>
          )}

          {filtered.map((row) => {
            const isEditing = editingId === row.idStr;
            if (isEditing) {
              return (
                <PayeeRowEditor
                  key={row.idStr}
                  initial={{ name: row.nameLabel, address: row.paymentAddress, statusKey: row.statusKey }}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(draft) => handleEditSubmit(row, draft)}
                  saving={savingId === row.idStr}
                />
              );
            }
            return (
              <div key={row.idStr} className="bb-payees-row" role="row">
                <div className="bb-payees-cell bb-payees-cell-name">
                  <div className="bb-payees-name-row">
                    <span className="bb-payees-name">{row.nameLabel || `Payee #${row.idStr}`}</span>
                  </div>
                  <div className="bb-payees-role bb-mono bb-small">#{row.idStr}</div>
                </div>
                <div className="bb-payees-cell bb-mono bb-small" style={{ color: "var(--bb-text-mute)" }}>
                  {shortAddress(row.paymentAddress)}
                </div>
                <div className="bb-payees-cell">
                  <PayeeStatusPill status={row.statusKey} />
                </div>
                <div className="bb-payees-cell bb-payees-cell-actions">
                  {editable && (
                    <button
                      className="bb-icon-btn-sm"
                      onClick={() => setEditingId(row.idStr)}
                      title="Edit payee"
                      disabled={savingId !== null}
                    >
                      ✎
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {batchOpen && (
        <BatchOnboardSheet
          onClose={() => setBatchOpen(false)}
          onSubmit={handleBatchSubmit}
          submitting={onboarding}
        />
      )}
    </>
  );
}
