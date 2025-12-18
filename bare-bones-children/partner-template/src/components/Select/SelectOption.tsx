export function SelectOption<T extends string | number>({
  value,
  label,
  onSelect,
  selected,
}: {
  value: T;
  label?: string;
  onSelect?: (v: T) => void;
  selected?: T | null;
}) {
  const isSelected = selected === value;

  return (
    <div
      onClick={() => onSelect?.(value)}
      style={{
        padding: "var(--spacing-md)",
        cursor: "pointer",
        background: isSelected
          ? "var(--colors-primary)"
          : "var(--colors-surface)",
        color: isSelected ? "#fff" : "var(--colors-text-main)",
        transition: "background 0.15s ease",
      }}
    >
      {label ?? value}
    </div>
  );
}
