import { AddressListField } from "./AddressListField";
import { AdminListField } from "./AdminListField";
import type { RolesForm, AdditionalMemberForm } from "./validation";
import { AccountType } from "./useDeployDao";

interface StepRolesProps {
  form: RolesForm;
  onChange: (next: Partial<RolesForm>) => void;
}

const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string; hint: string }> = [
  { value: AccountType.Member,         label: "Member",         hint: "Standard org member; role optional." },
  { value: AccountType.Investor,       label: "Investor",       hint: "Cap-table holder. Role usually empty." },
  { value: AccountType.AuthorizedUser, label: "Authorized user", hint: "External party (lawyer, consultant, etc.)." },
];

export function StepRoles({ form, onChange }: StepRolesProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p className="bb-muted bb-small" style={{ margin: 0 }}>
        Cancellers can veto proposals after voting passes. At least one is required — your wallet is pre-filled.
      </p>

      <AddressListField
        label="Cancellers"
        subtitle="Required: at least one address that can cancel queued proposals."
        values={form.cancellers}
        onChange={(cancellers) => onChange({ cancellers })}
        minOne
      />

      {/*
        MultiTenantAuth bootstrap. The launcher invokes
        `MultiTenantAuth.bootstrap(slug, superAdmin, initialAdmins)` after
        registering the org; super-admin is the only account that can lock
        the org, swap super-admin, or seed Pausers later. We default both
        fields to "use the timelock" (super-admin) and "no extra admins"
        because that's the safest minimal configuration.
      */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>
          Auth super-admin <span className="bb-muted">(optional)</span>
        </label>
        <div className="bb-field-hint">
          Leave blank to use the freshly deployed timelock as super-admin (recommended). Otherwise, the address you provide will own the slug in MultiTenantAuth and can never be locked out.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 8 }}>
          <input
            className="bb-input"
            value={form.authSuperAdminName}
            onChange={(e) => onChange({ authSuperAdminName: e.target.value })}
            placeholder='Display name (defaults to "Timelock")'
            maxLength={31}
          />
          <input
            className="bb-input bb-mono"
            value={form.authSuperAdmin}
            onChange={(e) => onChange({ authSuperAdmin: e.target.value })}
            placeholder="0x… (defaults to timelock)"
          />
        </div>
      </div>

      <AdminListField
        label="Initial admins"
        subtitle="Optional: seed the Admin role on MultiTenantAuth. Admins can later create roles, onboard members, and assign permissions via auth.configure(slug, ...). Names are stored on-chain (bytes32, ≤31 chars)."
        values={form.authInitialAdmins}
        onChange={(authInitialAdmins) => onChange({ authInitialAdmins })}
      />

      <AdditionalMembersField
        values={form.additionalMembers}
        onChange={(additionalMembers) => onChange({ additionalMembers })}
      />
    </div>
  );
}

interface AdditionalMembersFieldProps {
  values: AdditionalMemberForm[];
  onChange: (next: AdditionalMemberForm[]) => void;
}

/** Inline editor for the launcher's bulk-roster onboarding. Wallets here must
 *  NOT overlap with Super Admin / initialAdmins — MTA reverts on duplicate
 *  members. Empty rows are dropped on submit (handled in CreateDaoModal). */
function AdditionalMembersField({ values, onChange }: AdditionalMembersFieldProps) {
  function update(idx: number, patch: Partial<AdditionalMemberForm>) {
    onChange(values.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  function add() {
    onChange([
      ...values,
      { wallet: "", name: "", accountType: AccountType.Member, roleSlugString: "" },
    ]);
  }
  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500 }}>
        Additional members <span className="bb-muted">(optional)</span>
      </label>
      <div className="bb-field-hint">
        Onboard regular Members, Investors, or Authorized Users at launch. Each row
        is created in the new slug; assign a role slug (e.g.{" "}
        <span className="bb-mono">TokenMinter</span>,{" "}
        <span className="bb-mono">TokenPauser</span>) to grant it inline. Wallets here
        must not also appear in Super Admin or Initial Admins.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
        {values.map((row, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 1fr auto",
              gap: 6,
            }}
          >
            <input
              className="bb-input bb-mono"
              type="text"
              value={row.wallet}
              placeholder="0x… wallet"
              onChange={(e) => update(i, { wallet: e.target.value })}
            />
            <input
              className="bb-input"
              type="text"
              value={row.name}
              placeholder="Display name"
              maxLength={31}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <select
              className="bb-input"
              value={row.accountType}
              onChange={(e) => update(i, { accountType: Number(e.target.value) as AccountType })}
            >
              {ACCOUNT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              className="bb-input bb-mono"
              type="text"
              value={row.roleSlugString}
              placeholder="Role (optional)"
              maxLength={31}
              onChange={(e) => update(i, { roleSlugString: e.target.value })}
            />
            <button
              type="button"
              className="bb-icon-btn"
              onClick={() => remove(i)}
              aria-label="Remove member row"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="bb-btn-ghost bb-small"
          style={{ alignSelf: "start" }}
          onClick={add}
        >
          + Add member
        </button>
      </div>
    </div>
  );
}
