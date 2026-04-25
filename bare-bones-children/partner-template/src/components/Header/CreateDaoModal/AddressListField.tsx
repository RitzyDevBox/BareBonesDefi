interface AddressListFieldProps {
  label: string;
  subtitle?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  minOne?: boolean;
}

export function AddressListField({
  label,
  subtitle,
  values,
  onChange,
  placeholder = "0x…",
  minOne = false,
}: AddressListFieldProps) {
  const update = (i: number, v: string) => onChange(values.map((x, j) => (j === i ? v : x)));
  const add = () => onChange([...values, ""]);
  const remove = (i: number) => {
    if (values.length === 1) {
      onChange(minOne ? [""] : []);
      return;
    }
    onChange(values.filter((_, j) => j !== i));
  };

  return (
    <div className="bb-addr-list">
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{label}</label>
        {subtitle ? <div className="bb-field-hint" style={{ marginTop: 0 }}>{subtitle}</div> : null}
      </div>
      <div className="bb-addr-list-rows">
        {values.length === 0 && (
          <div className="bb-muted bb-small">None — click "Add address" to set one.</div>
        )}
        {values.map((v, i) => (
          <div key={i} className="bb-addr-list-row">
            <input
              className="bb-input bb-mono"
              value={v}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
            />
            <button
              type="button"
              className="bb-icon-btn-sm"
              aria-label="Remove address"
              onClick={() => remove(i)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="bb-addr-list-add" onClick={add}>
        + Add address
      </button>
    </div>
  );
}
