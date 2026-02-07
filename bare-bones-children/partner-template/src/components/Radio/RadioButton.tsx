
// components/Radio/RadioButton.tsx
interface RadioButtonProps<T extends number> {
  label: string;
  option: T;
  value?: T;
  onChange?: (v: T) => void;
  disabled?: boolean;
}

export function RadioButton<T extends number>({
  label,
  option,
  value,
  onChange,
  disabled,
}: RadioButtonProps<T>) {
  const checked = value === option;

  return (
    <label style={{ display: "flex", gap: 8, opacity: disabled ? 0.5 : 1 }}>
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.(option)}
      />
      {label}
    </label>
  );
}
