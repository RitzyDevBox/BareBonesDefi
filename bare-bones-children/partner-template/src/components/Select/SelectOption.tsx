export function SelectOption<T extends string | number>({
  value,
  label,
  onSelect,
  highlighted,
}: {
  value: T;
  label?: string;
  onSelect?: (v: T) => void;
  highlighted?: boolean;
  [key: string]: unknown;
}) {
  return (
    <div
      onClick={() => onSelect?.(value)}
      style={{
        padding: "var(--spacing-md)",
        cursor: "pointer",
        background: highlighted
          ? "var(--colors-primary)"
          : "var(--colors-surface)",
        color: highlighted ? "#fff" : "var(--colors-text-main)",
        transition: "background 0.15s ease",
      }}
    >
      {label ?? value}
    </div>
  );
}
