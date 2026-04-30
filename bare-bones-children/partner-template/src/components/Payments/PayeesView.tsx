import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useExecuteRawTx } from "../../hooks/useExecuteRawTx";
import { getBareBonesConfiguration } from "../../constants/misc";
import { PayeeStatus } from "../../constants/payroll";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel, PayeeModel } from "../../models/payments";
import { shortAddress } from "../../utils/formatUtils";
import { parsePayeeNameLabel } from "../../utils/payroll/payrollFormatters";
import { OrgConfigOpKind, encodeOrgConfigOp } from "../../utils/payroll/orgConfigOps";
import { orgSlugFor } from "../../utils/payroll/orgSlug";
import { Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { IconButton } from "../Button/IconButton";
import { AddressInput } from "../Inputs/AddressInput";

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
        <AddressInput
          className="bb-input bb-input-sm bb-mono"
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
        <ButtonSecondary
          size="sm"
          fullWidth={false}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </ButtonSecondary>
        <ButtonPrimary
          size="sm"
          fullWidth={false}
          disabled={!valid || saving}
          onClick={() => onSubmit({ name: name.trim(), address: address.trim(), statusKey })}
        >
          {saving ? <span className="bb-spinner bb-sm" style={{ marginRight: 6 }} /> : null}
          Stage
        </ButtonPrimary>
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
  const [savingId] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  // Staged adds: collected via the inline row editor. New payees that don't
  // exist on chain yet.
  type StagedPayee = { id: string; name: string; address: string };
  const [staged, setStaged] = useState<StagedPayee[]>([]);
  // Staged edits: changes against existing on-chain payees. Keyed by
  // payeeId-as-string. Submitted alongside adds in the same `configure` tx.
  type StagedEdit = { name: string; address: string; statusKey: PayeeStatusKey };
  const [stagedEdits, setStagedEdits] = useState<Record<string, StagedEdit>>({});
  // Bumped on each successful stage to remount the editor (clears its uncontrolled inputs).
  const [stageCounter, setStageCounter] = useState(0);
  const [stageError, setStageError] = useState<string | null>(null);

  // Single submit-staged-changes tx. Bundles every staged add (`PayeeOnboard`)
  // and every staged edit (`PayeeUpdate`) into one `configure(slug, ops)` call.
  // We always batch — no per-row immediate-fire paths anymore.
  const batchSubmitChanges = useExecuteRawTx(
    (
      _: number,
      orgSlug: string,
      adds: StagedPayee[],
      edits: Array<{ payee: PayeeModel; edit: StagedEdit }>,
    ) => {
      if (!payrollManagerAddress) throw new Error("Payroll manager address missing");
      const total = adds.length + edits.length;
      if (total === 0) throw new Error("No staged changes");
      const slugBytes = orgSlugFor(orgSlug);
      // Normalize to canonical EIP-55 checksum so ethers' Interface.encodeFunctionData
      // doesn't reject addresses the user typed in lower-case or with a wrong-case digit.
      // toLowerCase() strips whatever they typed; getAddress() reapplies the canonical form.
      const normalizeAddr = (a: string) => ethers.utils.getAddress(a.trim().toLowerCase());
      const ops = [
        ...adds.map((entry) =>
          encodeOrgConfigOp({
            kind: OrgConfigOpKind.PayeeOnboard,
            nameSlug: ethers.utils.formatBytes32String(entry.name.trim()),
            paymentAddress: normalizeAddr(entry.address),
            params: "0x",
          }),
        ),
        ...edits.map(({ payee, edit }) =>
          encodeOrgConfigOp({
            kind: OrgConfigOpKind.PayeeUpdate,
            payeeId: payee.payeeId,
            nameSlug: ethers.utils.formatBytes32String(edit.name.trim()),
            paymentAddress: normalizeAddr(edit.address),
            params: payee.params, // preserve existing params; the editor doesn't expose them
            status: statusCodeFromKey(edit.statusKey),
          }),
        ),
      ];
      return {
        to: payrollManagerAddress,
        data: iface.encodeFunctionData("configure", [slugBytes, ops]),
      } as any;
    },
    (
      _: number,
      __: string,
      adds: StagedPayee[],
      edits: Array<{ payee: PayeeModel; edit: StagedEdit }>,
    ) => {
      const a = adds.length;
      const e = edits.length;
      const parts: string[] = [];
      if (a) parts.push(`${a} add${a === 1 ? "" : "s"}`);
      if (e) parts.push(`${e} edit${e === 1 ? "" : "s"}`);
      return `Submitted ${parts.join(" + ")}`;
    },
  );

  const enriched = useMemo(
    () =>
      payees.map((p) => {
        const idStr = p.payeeId.toString();
        const edit = stagedEdits[idStr];
        return {
          ...p,
          idStr,
          // When an edit is staged, render the EDITED values in the row so the user
          // sees what's pending to be submitted.
          nameLabel: edit?.name ?? parsePayeeNameLabel(p.nameSlug),
          paymentAddress: edit?.address ?? p.paymentAddress,
          statusKey: edit ? edit.statusKey : statusKeyFromCode(Number(p.status ?? 0)),
          isEdited: Boolean(edit),
        };
      }),
    [payees, stagedEdits],
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

  function handleStageDraft(draft: { name: string; address: string; statusKey: PayeeStatusKey }) {
    setStageError(null);
    const name = draft.name.trim();
    const address = draft.address.trim().toLowerCase();
    // Match the row editor's permissive check: format-only, ignore EIP-55 checksum.
    // The contract doesn't care about checksum casing.
    if (!name || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setStageError("Name and a valid 0x address are required.");
      return;
    }
    // Don't let the user stage a duplicate of an existing on-chain payee or another staged row.
    const dupAddress =
      payees.some((p) => p.paymentAddress.toLowerCase() === address) ||
      staged.some((s) => s.address.toLowerCase() === address);
    const dupName =
      enriched.some((p) => p.nameLabel.toLowerCase() === name.toLowerCase()) ||
      staged.some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (dupAddress) {
      setStageError(`Address ${shortAddress(address)} is already a payee or staged.`);
      return;
    }
    if (dupName) {
      setStageError(`Name "${name}" is already a payee or staged.`);
      return;
    }
    setStaged((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, name, address },
    ]);
    setStageCounter((c) => c + 1);
  }

  function handleRemoveStaged(id: string) {
    setStaged((prev) => prev.filter((s) => s.id !== id));
  }

  function handleDiscardStaged() {
    setStaged([]);
    setStageError(null);
  }

  function handleStageEdit(
    payee: PayeeModel,
    draft: { name: string; address: string; statusKey: PayeeStatusKey },
  ) {
    setStageError(null);
    const name = draft.name.trim();
    const address = draft.address.trim();
    // Format-only check; ignore EIP-55 checksum casing (chain doesn't care).
    if (!name || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setStageError("Name and a valid 0x address are required.");
      return;
    }
    setStagedEdits((prev) => ({
      ...prev,
      [payee.payeeId.toString()]: { name, address, statusKey: draft.statusKey },
    }));
    setEditingId(null);
  }

  function handleUndoEdit(payeeIdStr: string) {
    setStagedEdits((prev) => {
      const next = { ...prev };
      delete next[payeeIdStr];
      return next;
    });
  }

  async function handleSubmitStaged() {
    if (!chainId || !slug) return;
    const editEntries = Object.entries(stagedEdits)
      .map(([idStr, edit]) => {
        const payee = payees.find((p) => p.payeeId.toString() === idStr);
        return payee ? { payee, edit } : null;
      })
      .filter((x): x is { payee: PayeeModel; edit: StagedEdit } => x !== null);
    if (staged.length === 0 && editEntries.length === 0) return;
    setOnboarding(true);
    setStageError(null);
    try {
      await batchSubmitChanges(chainId, slug, staged, editEntries);
      await onPayeesChanged();
      setStaged([]);
      setStagedEdits({});
      setAdding(false);
    } finally {
      setOnboarding(false);
    }
  }

  async function handleBatchSubmit(rows: Array<{ name: string; address: string }>) {
    if (!chainId || !slug || rows.length === 0) return;
    setOnboarding(true);
    try {
      // CSV-paste path goes through the same batched configure call — adds only,
      // no edits — so it shares the dispatcher with the inline staging flow.
      const adds: StagedPayee[] = rows.map((r, i) => ({
        id: `csv-${Date.now()}-${i}`,
        name: r.name,
        address: r.address,
      }));
      await batchSubmitChanges(chainId, slug, adds, []);
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

          {staged.length > 0 && (
            <>
              {staged.map((s) => (
                <div key={s.id} className="bb-payees-row bb-stg-added" role="row">
                  <div className="bb-payees-cell bb-payees-cell-name">
                    <div className="bb-payees-name-row">
                      <span className="bb-payees-name">{s.name}</span>
                    </div>
                    <div className="bb-payees-role bb-mono bb-small">staged</div>
                  </div>
                  <div className="bb-payees-cell bb-mono bb-small" style={{ color: "var(--bb-text-mute)" }}>
                    {shortAddress(s.address)}
                  </div>
                  <div className="bb-payees-cell">
                    <span className="bb-payee-status bb-payee-status-onhold">
                      <span className="bb-payee-status-dot" style={{ background: "var(--bb-warn)" }} />
                      Pending
                    </span>
                  </div>
                  <div className="bb-payees-cell bb-payees-cell-actions">
                    <IconButton
                      size="lg"
                      onClick={() => handleRemoveStaged(s.id)}
                      title="Remove from batch"
                      aria-label="Remove from batch"
                      disabled={onboarding}
                    >
                      ✕
                    </IconButton>
                  </div>
                </div>
              ))}
            </>
          )}

          {adding && (
            <PayeeRowEditor
              key={`stage-editor-${stageCounter}`}
              onCancel={() => { setAdding(false); setStageError(null); }}
              onSubmit={handleStageDraft}
              saving={false}
              showStatus={false}
            />
          )}

          {stageError && (
            <div className="bb-banner bb-banner-warn" style={{ margin: 12 }}>
              <span>⚠</span>
              <div>{stageError}</div>
              <span />
            </div>
          )}

          {(staged.length > 0 || Object.keys(stagedEdits).length > 0) && (
            <Row
              gap="md"
              justify="between"
              style={{
                padding: "10px 14px",
                borderTop: "1px solid var(--bb-line)",
                background: "var(--bb-bg-elev-2)",
              }}
            >
              <Text.Body size="sm" color="muted">
                {(() => {
                  const a = staged.length;
                  const e = Object.keys(stagedEdits).length;
                  const parts: string[] = [];
                  if (a) parts.push(`${a} add${a === 1 ? "" : "s"}`);
                  if (e) parts.push(`${e} edit${e === 1 ? "" : "s"}`);
                  return `${parts.join(" + ")} staged · submits as one transaction`;
                })()}
              </Text.Body>
              <Row gap="sm">
                <ButtonSecondary
                  size="sm"
                  fullWidth={false}
                  onClick={() => {
                    handleDiscardStaged();
                    setStagedEdits({});
                  }}
                  disabled={onboarding}
                >
                  Discard
                </ButtonSecondary>
                <ButtonPrimary
                  size="sm"
                  fullWidth={false}
                  onClick={() => void handleSubmitStaged()}
                  disabled={!editable || onboarding}
                >
                  {onboarding ? <span className="bb-spinner bb-sm" style={{ marginRight: 6 }} /> : null}
                  Submit ({staged.length + Object.keys(stagedEdits).length})
                </ButtonPrimary>
              </Row>
            </Row>
          )}

          {!loading && filtered.length === 0 && !adding && staged.length === 0 && (
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
                  onSubmit={(draft) => handleStageEdit(row, draft)}
                  saving={false}
                />
              );
            }
            const rowClass = `bb-payees-row${row.isEdited ? " bb-stg-edited" : ""}`;
            return (
              <div key={row.idStr} className={rowClass} role="row">
                <div className="bb-payees-cell bb-payees-cell-name">
                  <div className="bb-payees-name-row">
                    <span className="bb-payees-name">{row.nameLabel || `Payee #${row.idStr}`}</span>
                  </div>
                  <div className="bb-payees-role bb-mono bb-small">
                    {row.isEdited ? "edited · pending" : `#${row.idStr}`}
                  </div>
                </div>
                <div className="bb-payees-cell bb-mono bb-small" style={{ color: "var(--bb-text-mute)" }}>
                  {shortAddress(row.paymentAddress)}
                </div>
                <div className="bb-payees-cell">
                  <PayeeStatusPill status={row.statusKey} />
                </div>
                <div className="bb-payees-cell bb-payees-cell-actions">
                  {editable && row.isEdited && (
                    <IconButton
                      size="lg"
                      onClick={() => handleUndoEdit(row.idStr)}
                      title="Undo staged edit"
                      aria-label="Undo staged edit"
                      disabled={onboarding}
                    >
                      ↺
                    </IconButton>
                  )}
                  {editable && (
                    <IconButton
                      size="lg"
                      onClick={() => setEditingId(row.idStr)}
                      title="Edit payee"
                      aria-label="Edit payee"
                      disabled={savingId !== null}
                    >
                      ✎
                    </IconButton>
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
