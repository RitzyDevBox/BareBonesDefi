import { useEffect, useMemo, useState } from "react";
import {
  Constraint, ConstraintOp, Permission, Role, SignatureRequirement, SignatureRequirementType,
} from "../../types/members";
import { MembersModal } from "./MembersModal";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { AbiFunction, getKnownContracts, listWriteFunctions } from "../../utils/knownContracts";

/** Per-permission mode picked in the builder. Maps to MTA's PermissionMode
 *  enum (Allow=0, Deny=1) on the contract side. The full-contract grant
 *  variants (`grantAllowContract`, `grantDenyContract`) call `setTargetGrants`
 *  instead of `createPermissions`; the parent dispatches based on this. */
export type PermissionScope =
  | "allowFunction"
  | "denyFunction"
  | "grantAllowContract"
  | "grantDenyContract";

export interface SavePermissionIntent {
  scope: PermissionScope;
  /** roleSlug (bytes32) the permission/grant binds to. */
  roleSlug: string;
}

interface PermissionBuilderProps {
  /** `null` for new; existing `Permission` for edit. */
  initialPerm: Permission | null;
  /** All roles in the slug — needed for the "Bind to role" picker. */
  allRoles: Role[];
  onClose: () => void;
  onSave: (perm: Permission, intent: SavePermissionIntent) => void;
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
  rateMaxCalls: string;
  rateWindowValue: string;
  rateWindowUnit: RateWindowUnit;
  /** "" means freeform / "Custom" target. Otherwise the key of an entry from
   *  `getKnownContracts(chainId)`. */
  knownContractKey: string;
  /** Bind this permission/grant to a role. Empty string = unbound (form
   *  invalid until set). */
  roleSlug: string;
  /** Allow vs deny, function vs whole contract. See `PermissionScope`. */
  scope: PermissionScope;
}

type RateWindowUnit = "s" | "m" | "h" | "d";

const RATE_UNIT_SECONDS: Record<RateWindowUnit, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

const RATE_UNIT_LABELS: Record<RateWindowUnit, string> = {
  s: "seconds",
  m: "minutes",
  h: "hours",
  d: "days",
};

function rateWindowToInputs(windowSeconds: number): { value: string; unit: RateWindowUnit } {
  const units: RateWindowUnit[] = ["d", "h", "m", "s"];
  for (const u of units) {
    const div = RATE_UNIT_SECONDS[u];
    if (windowSeconds % div === 0) return { value: String(windowSeconds / div), unit: u };
  }
  return { value: String(windowSeconds), unit: "s" };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formInitial(initial: Permission | null): PermForm {
  const sig = initial?.sigRequirement;
  const isMulti = sig?.type === SignatureRequirementType.Multisig;
  const rate = initial?.rateLimit;
  const rateInputs = rate ? rateWindowToInputs(rate.windowSeconds) : { value: "", unit: "h" as RateWindowUnit };
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
    rateMaxCalls: rate ? String(rate.maxCalls) : "",
    rateWindowValue: rateInputs.value,
    rateWindowUnit: rateInputs.unit,
    knownContractKey: "",
    roleSlug: "",
    scope: "allowFunction",
  };
}

const SCOPE_OPTIONS: Array<{ value: PermissionScope; label: string; sub: string }> = [
  { value: "allowFunction", label: "Allow function", sub: "Single sig on a single function" },
  { value: "denyFunction", label: "Deny function", sub: "Block one function on a target" },
  { value: "grantAllowContract", label: "Allow whole contract", sub: "Every function on this target" },
  { value: "grantDenyContract", label: "Deny whole contract", sub: "Block every function on this target" },
];

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

export function PermissionBuilder({ initialPerm, allRoles, onClose, onSave }: PermissionBuilderProps) {
  const isEdit = !!initialPerm;
  const [form, setForm] = useState<PermForm>(() => formInitial(initialPerm));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { chainId } = useWalletProvider();
  const isContractScope = form.scope === "grantAllowContract" || form.scope === "grantDenyContract";

  const knownContracts = useMemo(() => getKnownContracts(chainId), [chainId]);
  const selectedKnownContract = useMemo(
    () => knownContracts.find((c) => c.key === form.knownContractKey) ?? null,
    [knownContracts, form.knownContractKey],
  );
  const knownContractFunctions: AbiFunction[] = useMemo(
    () => (selectedKnownContract ? listWriteFunctions(selectedKnownContract.abi) : []),
    [selectedKnownContract],
  );
  const selectedKnownFunction = useMemo(() => {
    if (!selectedKnownContract) return null;
    return knownContractFunctions.find((fn) => fn.signature === form.function.trim()) ?? null;
  }, [selectedKnownContract, knownContractFunctions, form.function]);

  function set<K extends keyof PermForm>(k: K, v: PermForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function pickKnownContract(key: string) {
    if (!key) {
      setForm((f) => ({ ...f, knownContractKey: "", function: "", selector: "" }));
      return;
    }
    const c = knownContracts.find((kc) => kc.key === key);
    if (!c) return;
    setForm((f) => ({
      ...f,
      knownContractKey: key,
      target: c.address || f.target,
      targetName: c.name,
      function: "",
      selector: "",
    }));
  }

  function pickKnownFunction(signature: string) {
    const fn = knownContractFunctions.find((kf) => kf.signature === signature);
    if (!fn) {
      setForm((f) => ({ ...f, function: "", selector: "" }));
      return;
    }
    setForm((f) => ({ ...f, function: fn.signature, selector: fn.selector }));
  }

  // Derive a mock selector when the user is in freeform mode (no known contract
  // picked) and types something that looks like a `name(types)` signature. The
  // known-contract path sets a real selector via ethers.
  useEffect(() => {
    if (isEdit) return;
    if (form.knownContractKey) return;
    const fn = form.function.trim();
    if (fn.includes("(") && fn.endsWith(")")) {
      setForm((f) => ({ ...f, selector: mockSelector(fn) }));
    } else {
      setForm((f) => ({ ...f, selector: "" }));
    }
  }, [form.function, form.knownContractKey, isEdit]);

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
    // Role binding is optional — without it the permission is saved as a
    // local "draft" the user can later attach to a role via the role
    // builder. With it, the permission is submitted on-chain immediately.
    if (!ETH_ADDRESS_RE.test(form.target.trim())) return false;
    // Whole-contract grants don't need a function signature.
    if (isContractScope) return true;
    return form.function.includes("(") && form.function.trim().endsWith(")");
  }, [form.target, form.function, isContractScope]);

  function submit() {
    if (!canSave) return;
    const sig: SignatureRequirement = form.sigType === SignatureRequirementType.Multisig
      ? {
          type: SignatureRequirementType.Multisig,
          threshold: Math.max(1, Number(form.sigThreshold) || 1),
          of: Math.max(1, Number(form.sigOf) || 1),
        }
      : { type: SignatureRequirementType.Single };
    const maxCalls = Math.max(0, Number(form.rateMaxCalls) || 0);
    const windowValue = Math.max(0, Number(form.rateWindowValue) || 0);
    const windowSeconds = windowValue * RATE_UNIT_SECONDS[form.rateWindowUnit];
    const rateLimit = maxCalls > 0 && windowSeconds > 0
      ? { maxCalls, windowSeconds }
      : null;
    const next: Permission = {
      id: isEdit && initialPerm ? initialPerm.id : `perm_${Math.random().toString(36).slice(2, 8)}`,
      name: form.name.trim(),
      target: form.target.trim(),
      targetName: form.targetName.trim() || "Unnamed contract",
      function: isContractScope ? "*" : form.function.trim(),
      selector: isContractScope ? "0x00000000" : form.selector,
      constraints: form.constraints.filter((c) => c.param && c.value !== ""),
      sigRequirement: sig,
      timeLock: form.timeLock || null,
      validity: { start: form.validityStart, end: form.validityEnd || null },
      rateLimit,
      usedByRoles: isEdit && initialPerm ? initialPerm.usedByRoles : 0,
    };
    onSave(next, { scope: form.scope, roleSlug: form.roleSlug });
  }

  const hint = !ETH_ADDRESS_RE.test(form.target.trim())
    ? "Pick a known contract or enter a target address"
    : !isContractScope && !canSave
      ? "Pick or enter a function signature"
      : !form.roleSlug
        ? "Saved as draft — attach to a role from the Roles tab to materialize on-chain"
        : isEdit
          ? "On-chain permission will be updated"
          : isContractScope
            ? "Will call setTargetGrants on MTA"
            : "Will call createPermissions on MTA";

  const footer = (
    <>
      <div className="bb-amw-foot-hint">{hint}</div>
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
        <div className="bb-amw-section-head">Mode</div>
        <div className="bb-amw-grid">
          <div className="bb-amw-field bb-full">
            <select
              className="bb-m-select"
              value={form.scope}
              onChange={(e) => set("scope", e.target.value as PermissionScope)}
            >
              {SCOPE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} — {s.sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bb-amw-section-head">Bind to role (optional)</div>
        <div className="bb-amw-grid">
          <div className="bb-amw-field bb-full">
            <select
              className="bb-m-select"
              value={form.roleSlug}
              onChange={(e) => set("roleSlug", e.target.value)}
            >
              <option value="">Save as draft (attach later)</option>
              {/* System roles are excluded — extending Admin / Pauser / etc.
                  with custom permissions would change the meaning of those
                  roles in surprising ways. They're managed at the contract
                  level only. */}
              {allRoles.filter((r) => !r.isSystemRole).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: "var(--bb-text-mute)", marginTop: 4 }}>
              {form.roleSlug
                ? "Will be materialized on-chain via createPermissions(role, …)."
                : "Saved locally as a draft — pick this permission from a role builder to attach + submit on-chain."}
            </div>
          </div>
        </div>

        <div className="bb-amw-grid">
          <div className="bb-amw-field bb-full">
            <label>Display name (optional)</label>
            <input
              className="bb-amw-input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Approve treasury spend < $10k"
            />
            <div style={{ fontSize: 11, color: "var(--bb-text-mute)", marginTop: 4 }}>
              For display only. Not stored on-chain — falls back to "Target · function".
            </div>
          </div>
        </div>

        <div className="bb-amw-section-head">Target contract</div>
        <div className="bb-amw-grid">
          <div className="bb-amw-field bb-full">
            <label>Known contract</label>
            <select
              className="bb-m-select"
              value={form.knownContractKey}
              onChange={(e) => pickKnownContract(e.target.value)}
            >
              <option value="">Custom (enter address + signature manually)</option>
              {knownContracts.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}{c.address ? ` · ${c.address.slice(0, 6)}…${c.address.slice(-4)}` : " (template)"}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: "var(--bb-text-mute)", marginTop: 4 }}>
              Pick a registered contract to get a real ABI-derived function picker and selector. Leave on "Custom" to type a freeform signature.
            </div>
          </div>
          <div className="bb-amw-field">
            <label>Display name</label>
            <input
              className="bb-amw-input"
              value={form.targetName}
              onChange={(e) => set("targetName", e.target.value)}
              placeholder="Treasury Safe"
              readOnly={!!selectedKnownContract}
            />
          </div>
          <div className="bb-amw-field">
            <label>Address</label>
            <input
              className="bb-amw-input bb-mono"
              value={form.target}
              onChange={(e) => set("target", e.target.value)}
              placeholder="0x…"
              readOnly={!!selectedKnownContract && !!selectedKnownContract.address}
            />
          </div>
          {!isContractScope && (
            <div className="bb-amw-field bb-full">
              <label>Function {selectedKnownContract ? "" : "signature"}</label>
              {selectedKnownContract ? (
                <select
                  className="bb-m-select bb-mono"
                  value={form.function}
                  onChange={(e) => pickKnownFunction(e.target.value)}
                >
                  <option value="">Pick a function…</option>
                  {knownContractFunctions.map((fn) => (
                    <option key={fn.signature} value={fn.signature}>
                      {fn.name}({fn.inputs.map((i) => `${i.type}${i.name ? ` ${i.name}` : ""}`).join(", ")})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="bb-amw-input bb-mono"
                  value={form.function}
                  onChange={(e) => set("function", e.target.value)}
                  placeholder="execTransaction(address,uint256,bytes)"
                />
              )}
              {form.selector && (
                <div style={{
                  fontSize: 11, color: "var(--bb-text-mute)", marginTop: 4,
                  fontFamily: "var(--bb-font-mono)",
                }}>
                  → selector {form.selector}
                  {selectedKnownFunction && (
                    <span style={{ marginLeft: 8, color: "var(--bb-success)" }}>(real)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isContractScope && (
          <div className="bb-amw-empty" style={{ padding: 14 }}>
            Whole-contract grants apply to every function on the target. Function-level
            constraints, rate limits, and validity windows do not apply — they're set
            per-function via the "Allow function" / "Deny function" mode.
          </div>
        )}

        {!isContractScope && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="bb-btn-ghost bb-btn-xs"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "▾ Hide advanced" : "▸ Show advanced (constraints, signing, validity, rate limit)"}
            </button>
          </div>
        )}

        {!isContractScope && showAdvanced && (
          <>
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
          {form.constraints.map((c, i) => {
            const knownInput = selectedKnownFunction?.inputs.find((inp) => inp.name === c.param);
            const wordOffset = selectedKnownFunction
              ? selectedKnownFunction.inputs.findIndex((inp) => inp.name === c.param) * 32
              : null;
            return (
              <div key={i} className="bb-pm-c-edit-row">
                {selectedKnownFunction ? (
                  <select
                    className="bb-m-select bb-mono"
                    value={c.param}
                    onChange={(e) => {
                      const next = e.target.value;
                      const inp = selectedKnownFunction.inputs.find((x) => x.name === next);
                      updConstraint(i, { param: next, type: inp?.type ?? c.type });
                    }}
                  >
                    <option value="">parameter…</option>
                    {selectedKnownFunction.inputs.map((inp, idx) => (
                      <option key={`${inp.name || idx}-${idx}`} value={inp.name || `arg${idx}`}>
                        {inp.name || `arg${idx}`} ({inp.type})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="bb-amw-input bb-mono"
                    placeholder="param"
                    value={c.param}
                    onChange={(e) => updConstraint(i, { param: e.target.value })}
                  />
                )}
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
                  disabled={!!knownInput}
                >
                  {SOLIDITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  {knownInput && !SOLIDITY_TYPES.includes(knownInput.type as typeof SOLIDITY_TYPES[number]) && (
                    <option value={knownInput.type}>{knownInput.type}</option>
                  )}
                </select>
                <button
                  type="button"
                  className="bb-pm-c-rm"
                  onClick={() => rmConstraint(i)}
                  aria-label="Remove constraint"
                >
                  ✕
                </button>
                {wordOffset !== null && wordOffset >= 0 && (
                  <div style={{
                    gridColumn: "1 / -1",
                    fontSize: 10.5,
                    color: "var(--bb-text-mute)",
                    fontFamily: "var(--bb-font-mono)",
                    marginTop: -2,
                  }}>
                    → wordOffset {wordOffset} (post-selector byte offset)
                  </div>
                )}
              </div>
            );
          })}
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

        <div className="bb-amw-section-head">Rate limit</div>
        <div className="bb-amw-grid">
          <div className="bb-amw-field">
            <label>Max calls</label>
            <input
              className="bb-amw-input"
              type="number"
              min={0}
              value={form.rateMaxCalls}
              onChange={(e) => set("rateMaxCalls", e.target.value)}
              placeholder="0 = unlimited"
            />
          </div>
          <div className="bb-amw-field">
            <label>Per window</label>
            <input
              className="bb-amw-input"
              type="number"
              min={0}
              value={form.rateWindowValue}
              onChange={(e) => set("rateWindowValue", e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="bb-amw-field">
            <label>Unit</label>
            <select
              className="bb-m-select"
              value={form.rateWindowUnit}
              onChange={(e) => set("rateWindowUnit", e.target.value as RateWindowUnit)}
            >
              {(Object.keys(RATE_UNIT_LABELS) as RateWindowUnit[]).map((u) => (
                <option key={u} value={u}>{RATE_UNIT_LABELS[u]}</option>
              ))}
            </select>
          </div>
        </div>
          </>
        )}
      </div>
    </MembersModal>
  );
}
