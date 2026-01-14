import { ButtonBase, ButtonBaseProps } from "./ButtonBase";

export function SmallButton({
  style,
  ...rest
}: ButtonBaseProps) {
  return (
    <ButtonBase
      {...rest}
      size="sm"
      style={{
        height: 32,
        padding: "0 var(--spacing-sm)",
        fontSize: "0.75rem",
        whiteSpace: "nowrap",
        background: "var(--colors-surface)",
        border: "1px solid var(--colors-border)",
        color: "var(--colors-primary)",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
