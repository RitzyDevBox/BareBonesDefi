import { useState } from "react";
import { ACCOUNT_TYPES } from "../../data/membersSeed";
import {
  AccountTypeId, Permission, Role, SignatureRequirementType,
} from "../../types/members";
import { MembersModal } from "./MembersModal";

interface RoleBuilderProps {
  /** `null` for a brand-new role; an existing `Role` for edit/duplicate. */
  initialRole: Role | null;
  allPermissions: Permission[];
  onClose: () => void;
  onSave: (role: Role) => void;
}

interface RoleForm {
  name: string;
  desc: string;
  accountTypes: AccountTypeId[];
  permissions: string[];
  capEnabled: boolean;
  maxMembers: string;
  maxValue: string;
}

function formInitial(initial: Role | null, isDuplicate: boolean): RoleForm {
  return {
    name: isDuplicate ? `${initial?.name} (copy)` : initial?.name ?? "",
    desc: initial?.desc ?? "",
    accountTypes: initial?.accountTypes ?? [AccountTypeId.Member],
    permissions: initial?.permissions ?? [],
    capEnabled: !!initial?.cap,
    maxMembers: initial?.cap?.maxMembers != null ? String(initial.cap.maxMembers) : "",
    maxValue: initial?.cap?.maxValue ?? "",
  };
}

function sigLabel(p: Permission): string {
  return p.sigRequirement.type === SignatureRequirementType.Multisig
    ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
    : "single";
}

export function RoleBuilder({ initialRole, allPermissions, onClose, onSave }: RoleBuilderProps) {
  // Default roles (`isDefault: true`) are duplicated rather than edited in
  // place, so we don't mutate the canonical seeds. Custom roles can be edited.
  const isEdit = !!initialRole && !initialRole.isDefault;
  const isDuplicate = !!initialRole && initialRole.isDefault;
  const [form, setForm] = useState<RoleForm>(() => formInitial(initialRole, isDuplicate));

  function set<K extends keyof RoleForm>(k: K, v: RoleForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function togglePerm(id: string) {
    set("permissions", form.permissions.includes(id)
      ? form.permissions.filter((x) => x !== id)
      : [...form.permissions, id]);
  }
  function toggleAcct(id: AccountTypeId) {
    set("accountTypes", form.accountTypes.includes(id)
      ? form.accountTypes.filter((x) => x !== id)
      : [...form.accountTypes, id]);
  }

  const canSave = form.name.trim().length > 1 && form.accountTypes.length > 0;

  function submit() {
    if (!canSave) return;
    const cap = form.capEnabled
      ? {
          ...(form.maxMembers ? { maxMembers: Number(form.maxMembers) } : {}),
          ...(form.maxValue ? { maxValue: form.maxValue } : {}),
        }
      : null;
    const next: Role = {
      id: isEdit && initialRole ? initialRole.id : `role_${Math.random().toString(36).slice(2, 8)}`,
      name: form.name.trim(),
      desc: form.desc.trim(),
      accountTypes: form.accountTypes,
      permissions: form.permissions,
      cap: cap && (cap.maxMembers != null || cap.maxValue) ? cap : null,
      isDefault: false,
      memberCount: isEdit && initialRole ? initialRole.memberCount : 0,
    };
    onSave(next);
  }

  const kicker = isEdit ? "Edit role" : isDuplicate ? "Duplicate role" : "New role";

  const footer = (
    <>
      <div className="bb-amw-foot-hint">
        {!canSave
          ? "Name + at least one account type required"
          : isEdit
            ? "On-chain role record will be updated"
            : "New role will be created and stored on-chain"}
      </div>
      <div className="bb-amw-foot-actions">
        <button className="bb-btn-ghost bb-btn-xs" onClick={onClose}>Cancel</button>
        <button className="bb-btn-primary bb-btn-xs" disabled={!canSave} onClick={submit}>
          ✓ {isEdit ? "Save changes" : "Create role"}
        </button>
      </div>
    </>
  );

  return (
    <MembersModal kicker={kicker} title={form.name || "Untitled role"} onClose={onClose} footer={footer}>
      <div className="bb-amw-body">
        <div className="bb-amw-grid">
          <div className="bb-amw-field bb-full">
            <label>Role name</label>
            <input
              className="bb-amw-input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Treasury Signer"
            />
          </div>
          <div className="bb-amw-field bb-full">
            <label>Description</label>
            <input
              className="bb-amw-input"
              value={form.desc}
              onChange={(e) => set("desc", e.target.value)}
              placeholder="What this role is responsible for"
            />
          </div>
        </div>

        <div className="bb-amw-section-head">Applies to account types</div>
        <div className="bb-rb-acct-row">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.id}
              className={`bb-rb-acct${form.accountTypes.includes(t.id) ? " bb-on" : ""}`}
              onClick={() => toggleAcct(t.id)}
            >
              <span className="bb-rb-check">✓</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                <div style={{
                  fontSize: 10.5, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)",
                }}>{t.sub}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="bb-amw-section-head">
          Permissions
          <span style={{
            marginLeft: "auto", fontSize: 10.5, color: "var(--bb-text-mute)",
            fontFamily: "var(--bb-font-mono)",
          }}>
            {form.permissions.length} of {allPermissions.length} selected
          </span>
        </div>
        <div className="bb-rb-perms">
          {allPermissions.map((p) => {
            const on = form.permissions.includes(p.id);
            return (
              <button
                key={p.id}
                className={`bb-rb-perm${on ? " bb-on" : ""}`}
                onClick={() => togglePerm(p.id)}
              >
                <span className="bb-rb-check">✓</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bb-rb-perm-name">{p.name}</div>
                  <div className="bb-rb-perm-sub">
                    {p.targetName} · {p.function.split("(")[0]}
                    {p.constraints.length > 0
                      && ` · ${p.constraints.length} constraint${p.constraints.length === 1 ? "" : "s"}`}
                  </div>
                </div>
                <span className="bb-rb-perm-sig">{sigLabel(p)}</span>
              </button>
            );
          })}
        </div>

        <div className="bb-amw-section-head">Caps &amp; guardrails</div>
        <label className="bb-amw-kyc-row" style={{
          padding: 12, background: "var(--bb-bg)", border: "1px solid var(--bb-line)",
          borderRadius: 10, cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={form.capEnabled}
            onChange={(e) => set("capEnabled", e.target.checked)}
          />
          <span>
            <b>Apply role-level caps</b>
            <span className="bb-amw-kyc-hint">
              Independent of permission-level constraints. Useful for capping headcount or aggregate spend.
            </span>
          </span>
        </label>
        {form.capEnabled && (
          <div className="bb-amw-grid" style={{ marginTop: 10 }}>
            <div className="bb-amw-field">
              <label>Max members</label>
              <input
                className="bb-amw-input"
                type="number"
                min={0}
                value={form.maxMembers}
                onChange={(e) => set("maxMembers", e.target.value)}
                placeholder="e.g. 5"
              />
            </div>
            <div className="bb-amw-field">
              <label>Max single-tx value</label>
              <input
                className="bb-amw-input bb-mono"
                value={form.maxValue}
                onChange={(e) => set("maxValue", e.target.value)}
                placeholder="$50,000"
              />
            </div>
          </div>
        )}
      </div>
    </MembersModal>
  );
}
