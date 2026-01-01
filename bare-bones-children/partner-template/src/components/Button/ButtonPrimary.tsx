import { ButtonBase, ButtonShape, ButtonSize } from "./ButtonBase";

interface ButtonPrimaryProps
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
}: ButtonPrimaryProps) {
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
