import React from "react";
import { ButtonBase } from "./ButtonBase";

export function ButtonPrimary(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <ButtonBase
      {...props}
      fullWidth
      style={{
        background: "var(--colors-primary)",
        color: "#fff",
        border: "none",
        ...props.style,
      }}
    />
  );
}
