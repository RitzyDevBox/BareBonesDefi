import { ButtonBase, ButtonShape, ButtonSize } from "./ButtonBase";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  shape?: ButtonShape;
  fullWidth?: boolean;
}

export function ButtonPrimary({
  size = "md",
  shape = "rounded",
  fullWidth = true,
  style,
  ...rest
}: ButtonProps) {
  return (
    <ButtonBase
      {...rest}
      size={size}
      shape={shape}
      fullWidth={fullWidth}
      style={{
        background: "var(--colors-primary)",
        color: "#fff",
        border: "none",
        ...style,
      }}
    />
  );
}

export function ButtonSecondary({
  size = "md",
  shape = "rounded",
  fullWidth = true,
  style,
  ...rest
}: ButtonProps) {
  return (
    <ButtonBase
      {...rest}
      size={size}
      shape={shape}
      fullWidth={fullWidth}
      style={{
        background: "var(--colors-surface)",
        color: "var(--colors-text-main)",
        border: "1px solid var(--colors-border)",
        ...style,
      }}
    />
  );
}
