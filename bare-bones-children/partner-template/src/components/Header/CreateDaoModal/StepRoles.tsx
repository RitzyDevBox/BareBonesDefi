import { AddressListField } from "./AddressListField";
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
    </div>
  );
}
