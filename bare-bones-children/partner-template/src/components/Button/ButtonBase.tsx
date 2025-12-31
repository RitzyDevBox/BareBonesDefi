import React from "react";
import { ClickableSurface } from "../Primitives";

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "square" | "rounded" | "pill" | "circle";

interface ButtonBaseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  shape?: ButtonShape;
  fullWidth?: boolean;
}

/**
 * --------------------------------------
 * BaseButton — single source of truth
 * --------------------------------------
 */
export function ButtonBase({
  size = "md",
  shape = "square",
  fullWidth = false,
  style,
  children,
  ...rest
}: ButtonBaseProps) {
  const paddingBySize: Record<ButtonSize, string> = {
    sm: "var(--spacing-sm)",
    md: "var(--spacing-md)",
    lg: "var(--spacing-lg)",
  };

  const radiusByShape = {
    square: "1px",
    rounded: "var(--radius-md)",
    pill: "999px",
    circle: "50%",
  };

  const isIconSized = typeof style?.width !== "undefined" || typeof style?.height !== "undefined";

  return (
    <ClickableSurface as="button"
      {...rest}
      style={{
        padding: isIconSized ? 0 : paddingBySize[size],
        borderRadius: radiusByShape[shape],
        width: fullWidth ? "100%" : undefined,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--spacing-xs)",
        userSelect: "none",
        ...style, // 👈 caller can override
      }}
    >
      {children}
    </ClickableSurface>
  );
}
