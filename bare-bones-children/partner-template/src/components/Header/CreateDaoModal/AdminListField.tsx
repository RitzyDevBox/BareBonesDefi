import type { AdminInit } from "./useDeployDao";

interface AdminListFieldProps {
  label: string;
  subtitle?: string;
  values: AdminInit[];
  onChange: (values: AdminInit[]) => void;
}

/**
 * Two-column row editor for initial-admin entries (wallet + display name).
 * Mirrors `AddressListField` but pairs each address with a name input that
 * encodes to bytes32 on submit. Empty rows are accepted; the deploy flow
 * filters them out via validation.
 */
export function AdminListField({ label, subtitle, values, onChange }: AdminListFieldProps) {
  const update = (i: number, patch: Partial<AdminInit>) =>
    onChange(values.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const add = () => onChange([...values, { wallet: "", name: "" }]);
  const remove = (i: number) => {
    onChange(values.filter((_, j) => j !== i));
  };

  return (
    <div className="bb-addr-list" data-testid="dao-admin-list">
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{label}</label>
        {subtitle ? <div className="bb-field-hint" style={{ marginTop: 0 }}>{subtitle}</div> : null}
      </div>
      <div className="bb-addr-list-rows">
        {values.length === 0 && (
          <div className="bb-muted bb-small">None — click "Add admin" to seed one.</div>
        )}
        {values.map((v, i) => (
          <div
            key={i}
            data-testid={`dao-admin-row-${i}`}
            className="bb-addr-list-row"
            style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr) auto", gap: 8 }}
          >
            <input
              data-testid={`dao-admin-row-${i}-name-input`}
              className="bb-input"
              value={v.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Display name"
              maxLength={31}
            />
            <input
              data-testid={`dao-admin-row-${i}-address-input`}
              className="bb-input bb-mono"
              value={v.wallet}
              onChange={(e) => update(i, { wallet: e.target.value })}
              placeholder="0x…"
            />
            <button
              type="button"
              data-testid={`dao-admin-row-${i}-remove-btn`}
              className="bb-icon-btn-sm"
              aria-label="Remove admin"
              onClick={() => remove(i)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        data-testid="dao-admin-list-add-btn"
        className="bb-addr-list-add"
        onClick={add}
      >
        + Add admin
      </button>
    </div>
  );
}
