import { useEffect, useMemo, useState } from "react";
import {
  Constraint, ConstraintOp, Permission, SignatureRequirement, SignatureRequirementType,
} from "../../types/members";
import { MembersModal } from "./MembersModal";

interface PermissionBuilderProps {
  /** `null` for new; existing `Permission` for edit. */
  initialPerm: Permission | null;
  onClose: () => void;
  onSave: (perm: Permission) => void;
}

const OP_LABELS: Record<ConstraintOp, string> = {
  [ConstraintOp.Eq]: "equals",
  [ConstraintOp.Lt]: "less than",
  [ConstraintOp.Lte]: "at most",
  [ConstraintOp.Gt]: "greater than",
  [ConstraintOp.Gte]: "at least",
};

const SOLIDITY_TYPES = ["uint256", "address", "bytes32", "bool", "string"] as const;

const TIMELOCK_OPTIONS = ["", "6h", "24h", "48h", "72h", "7d"] as const;

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface PermForm {
  name: string;
  targetName: string;
  target: string;
  function: string;
  selector: string;
  constraints: Constraint[];
  sigType: SignatureRequirementType;
  sigThreshold: string;
  sigOf: string;
  timeLock: string;
  validityStart: string;
  validityEnd: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formInitial(initial: Permission | null): PermForm {
  const sig = initial?.sigRequirement;
  const isMulti = sig?.type === SignatureRequirementType.Multisig;
  return {
    name: initial?.name ?? "",
    targetName: initial?.targetName ?? "",
    target: initial?.target ?? "",
    function: initial?.function ?? "",
    selector: initial?.selector ?? "",
    constraints: initial?.constraints ?? [],
    sigType: sig?.type ?? SignatureRequirementType.Single,
    sigThreshold: isMulti && sig ? String(sig.threshold) : "2",
    sigOf: isMulti && sig ? String(sig.of) : "3",
    timeLock: initial?.timeLock ?? "",
    validityStart: initial?.validity?.start ?? todayIso(),
    validityEnd: initial?.validity?.end ?? "",
  };
}

/** Cheap deterministic hash → 4-byte selector. The real selector requires
 *  keccak256, which we'd pull from ethers — but the modal is illustrative
 *  until the on-chain side ships, so a stable mock keeps the preview useful
 *  without dragging in the dep. */
function mockSelector(fnSig: string): string {
  let h = 0;
  for (let i = 0; i < fnSig.length; i += 1) {
    h = ((h << 5) - h + fnSig.charCodeAt(i)) | 0;
  }
  const hex = (Math.abs(h).toString(16) + "00000000").slice(0, 8);
  return `0x${hex}`;
}

export function PermissionBuilder({ initialPerm, onClose, onSave }: PermissionBuilderProps) {
  const isEdit = !!initialPerm;
  const [form, setForm] = useState<PermForm>(() => formInitial(initialPerm));

  function set<K extends keyof PermForm>(k: K, v: PermForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Derive a mock selector for new permissions when the function signature
  // looks like `name(types)`. Skip for edits so we don't overwrite a real
  // on-chain selector with our placeholder.
  useEffect(() => {
    if (isEdit) return;
    const fn = form.function.trim();
    if (fn.includes("(") && fn.endsWith(")")) {
      setForm((f) => ({ ...f, selector: mockSelector(fn) }));
    } else {
      setForm((f) => ({ ...f, selector: "" }));
    }
  }, [form.function, isEdit]);

  function addConstraint() {
    set("constraints", [
      ...form.constraints,
      { param: "", op: ConstraintOp.Lte, value: "", type: "uint256" },
    ]);
  }
  function updConstraint(i: number, patch: Partial<Constraint>) {
    set("constraints", form.constraints.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function rmConstraint(i: number) {
    set("constraints", form.constraints.filter((_, idx) => idx !== i));
  }

  const canSave = useMemo(() => {
    return form.name.trim().length > 1
      && ETH_ADDRESS_RE.test(form.target.trim())
      && form.function.includes("(") && form.function.trim().endsWith(")");
  }, [form.name, form.target, form.function]);

  function submit() {
    if (!canSave) return;
    const sig: SignatureRequirement = form.sigType === SignatureRequirementType.Multisig
      ? {
          type: SignatureRequirementType.Multisig,
          threshold: Math.max(1, Number(form.sigThreshold) || 1),
          of: Math.max(1, Number(form.sigOf) || 1),
        }
      : { type: SignatureRequirementType.Single };
    const next: Permission = {
      id: isEdit && initialPerm ? initialPerm.id : `perm_${Math.random().toString(36).slice(2, 8)}`,
      name: form.name.trim(),
      target: form.target.trim(),
      targetName: form.targetName.trim() || "Unnamed contract",
      function: form.function.trim(),
      selector: form.selector,
      constraints: form.constraints.filter((c) => c.param && c.value !== ""),
      sigRequirement: sig,
      timeLock: form.timeLock || null,
      validity: { start: form.validityStart, end: form.validityEnd || null },
      usedByRoles: isEdit && initialPerm ? initialPerm.usedByRoles : 0,
    };
    onSave(next);
  }

  const footer = (
    <>
      <div className="bb-amw-foot-hint">
        {!canSave
          ? "Name + valid target address + function signature required"
          : isEdit
            ? "On-chain permission unit will be updated"
            : "Permission will be deployed and ready to bundle into roles"}
      </div>
      <div className="bb-amw-foot-actions">
        <button className="bb-btn-ghost bb-btn-xs" onClick={onClose}>Cancel</button>
        <button className="bb-btn-primary bb-btn-xs" disabled={!canSave} onClick={submit}>
          ✓ {isEdit ? "Save changes" : "Create permission"}
        </button>
      </div>
    </>
  );

  return (
    <MembersModal
      kicker={isEdit ? "Edit permission" : "New permission"}
      title={form.name || "Untitled permission"}
      onClose={onClose}
      footer={footer}
    >
      <div className="bb-amw-body">
        <div className="bb-amw-grid">
          <div className="bb-amw-field bb-full">
            <label>Permission name</label>
            <input
              className="bb-amw-input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Approve treasury spend < $10k"
            />
          </div>
        </div>

        <div className="bb-amw-section-head">Target contract</div>
        <div className="bb-amw-grid">
          <div className="bb-amw-field">
            <label>Display name</label>
            <input
              className="bb-amw-input"
              value={form.targetName}
              onChange={(e) => set("targetName", e.target.value)}
              placeholder="Treasury Safe"
            />
          </div>
          <div className="bb-amw-field">
            <label>Address</label>
            <input
              className="bb-amw-input bb-mono"
              value={form.target}
              onChange={(e) => set("target", e.target.value)}
              placeholder="0x…"
            />
          </div>
          <div className="bb-amw-field bb-full">
            <label>Function signature</label>
            <input
              className="bb-amw-input bb-mono"
              value={form.function}
              onChange={(e) => set("function", e.target.value)}
              placeholder="execTransaction(address,uint256,bytes)"
            />
            {form.selector && (
              <div style={{
                fontSize: 11, color: "var(--bb-text-mute)", marginTop: 4,
                fontFamily: "var(--bb-font-mono)",
              }}>
                → selector {form.selector}
              </div>
            )}
          </div>
        </div>

        <div className="bb-amw-section-head">
          Calldata constraints
          <button
            className="bb-btn-ghost bb-btn-xs"
            style={{ marginLeft: "auto" }}
            onClick={addConstraint}
          >
            + Add constraint
          </button>
        </div>
        {form.constraints.length === 0 && (
          <div className="bb-amw-empty">None — any calldata matching the selector will be allowed.</div>
        )}
        <div className="bb-pm-constraint-edit-list">
          {form.constraints.map((c, i) => (
            <div key={i} className="bb-pm-c-edit-row">
              <input
                className="bb-amw-input bb-mono"
                placeholder="param"
                value={c.param}
                onChange={(e) => updConstraint(i, { param: e.target.value })}
              />
              <select
                className="bb-m-select"
                value={c.op}
                onChange={(e) => updConstraint(i, { op: e.target.value as ConstraintOp })}
              >
                {Object.values(ConstraintOp).map((op) => (
                  <option key={op} value={op}>{OP_LABELS[op]}</option>
                ))}
              </select>
              <input
                className="bb-amw-input bb-mono"
                placeholder="value"
                value={c.value}
                onChange={(e) => updConstraint(i, { value: e.target.value })}
              />
              <select
                className="bb-m-select"
                value={c.type}
                onChange={(e) => updConstraint(i, { type: e.target.value })}
              >
                {SOLIDITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                type="button"
                className="bb-pm-c-rm"
                onClick={() => rmConstraint(i)}
                aria-label="Remove constraint"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="bb-amw-section-head">Signing requirement</div>
        <div className="bb-amw-wallet-toggle">
          <button
            className={`bb-amw-wt${form.sigType === SignatureRequirementType.Single ? " bb-on" : ""}`}
            onClick={() => set("sigType", SignatureRequirementType.Single)}
          >
            <span className="bb-amw-wt-icon">⊙</span>
            <div>
              <div className="bb-amw-wt-name">Single signer</div>
              <div className="bb-amw-wt-sub">Any holder of the role can execute alone</div>
            </div>
          </button>
          <button
            className={`bb-amw-wt${form.sigType === SignatureRequirementType.Multisig ? " bb-on" : ""}`}
            onClick={() => set("sigType", SignatureRequirementType.Multisig)}
          >
            <span className="bb-amw-wt-icon">≡</span>
            <div>
              <div className="bb-amw-wt-name">Multisig</div>
              <div className="bb-amw-wt-sub">M of N role holders must co-sign</div>
            </div>
          </button>
        </div>
        {form.sigType === SignatureRequirementType.Multisig && (
          <div className="bb-amw-grid" style={{ marginTop: 10 }}>
            <div className="bb-amw-field">
              <label>Threshold (M)</label>
              <input
                className="bb-amw-input"
                type="number"
                min={1}
                value={form.sigThreshold}
                onChange={(e) => set("sigThreshold", e.target.value)}
              />
            </div>
            <div className="bb-amw-field">
              <label>Of (N)</label>
              <input
                className="bb-amw-input"
                type="number"
                min={1}
                value={form.sigOf}
                onChange={(e) => set("sigOf", e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="bb-amw-section-head">Timing</div>
        <div className="bb-amw-grid">
          <div className="bb-amw-field">
            <label>Timelock (optional)</label>
            <select
              className="bb-m-select"
              value={form.timeLock}
              onChange={(e) => set("timeLock", e.target.value)}
            >
              {TIMELOCK_OPTIONS.map((opt) => (
                <option key={opt || "none"} value={opt}>{opt || "No timelock"}</option>
              ))}
            </select>
          </div>
          <div className="bb-amw-field">
            <label>Validity start</label>
            <input
              className="bb-amw-input bb-mono"
              type="date"
              value={form.validityStart}
              onChange={(e) => set("validityStart", e.target.value)}
            />
          </div>
          <div className="bb-amw-field bb-full">
            <label>Validity end (optional)</label>
            <input
              className="bb-amw-input bb-mono"
              type="date"
              value={form.validityEnd}
              onChange={(e) => set("validityEnd", e.target.value)}
            />
          </div>
        </div>
      </div>
    </MembersModal>
  );
}
