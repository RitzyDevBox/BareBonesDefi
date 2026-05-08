import { AddressListField } from "./AddressListField";
import { AdminListField } from "./AdminListField";
import type { RolesForm } from "./validation";

interface StepRolesProps {
  form: RolesForm;
  onChange: (next: Partial<RolesForm>) => void;
}

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
    </div>
  );
}
