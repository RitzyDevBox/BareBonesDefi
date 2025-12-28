import React from "react";

export function IconButton({
  children,
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: `1px solid var(--colors-border)`,
        background: "var(--colors-surface)",
        color: "var(--colors-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 18,
        lineHeight: 1,
        padding: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

