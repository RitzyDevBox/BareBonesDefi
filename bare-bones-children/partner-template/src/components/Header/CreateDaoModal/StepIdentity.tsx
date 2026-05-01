import type { IdentityForm } from "./validation";

interface StepIdentityProps {
  form: IdentityForm;
  onChange: (next: Partial<IdentityForm>) => void;
  locked?: boolean;
}

export function StepIdentity({ form, onChange, locked }: StepIdentityProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p className="bb-muted bb-small" style={{ margin: 0 }}>
        Pick a unique slug to identify the organization on-chain. This name is reused across payroll and governance.
      </p>

      <div className="bb-field-grid">
        <div className="bb-field bb-full">
          <label>Organization slug</label>
          {locked ? (
            <div className="bb-input bb-mono" style={{ background: "var(--colors-surface-raised, #f5f5f5)", cursor: "not-allowed", opacity: 0.7 }}>
              {form.orgSlug}
            </div>
          ) : (
            <input
              className="bb-input bb-mono"
              value={form.orgSlug}
              onChange={(e) => onChange({ orgSlug: e.target.value })}
              placeholder="my-org"
              maxLength={31}
              data-testid="dao-orgslug-input"
            />
          )}
          <div className="bb-field-hint">{locked ? "Organization slug is fixed for this deployment." : "Up to 31 bytes · used as the bytes32 identifier on-chain."}</div>
        </div>
      </div>
    </div>
  );
}
