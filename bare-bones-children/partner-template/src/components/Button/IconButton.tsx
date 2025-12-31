import React from "react";
import { ButtonBase, ButtonShape } from "./ButtonBase";

type IconButtonSize = "sm" | "md" | "lg";

const ICON_SIZE: Record<IconButtonSize, string> = {
  sm: "var(--spacing-md)",
  md: "var(--spacing-lg)",
  lg: "var(--spacing-xl)",
};

const ICON_FONT: Record<IconButtonSize, string> = {
  sm: "14px",
  md: "18px",
  lg: "22px",
};

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  shape?: ButtonShape;
}

export function IconButton({
  size = "md",
  shape = "square",
  style,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <ButtonBase
      {...rest}
      size={size}
      shape={shape}
      style={{
        width: ICON_SIZE[size],
        height: ICON_SIZE[size],
        padding: 0,
        fontSize: ICON_FONT[size],
        background: "var(--colors-surface)",
        border: "1px solid var(--colors-border)",
        color: "var(--colors-primary)",
        ...style,
      }}
    >
      {children}
    </ButtonBase>
  );
}
