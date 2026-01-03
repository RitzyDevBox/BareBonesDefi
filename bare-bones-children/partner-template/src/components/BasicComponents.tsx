/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { forwardRef } from "react";
import { cssVar } from "../utils/themeUtils";

// ----------------------
// BOX
// ----------------------

export const Box = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function Box({ children, style, ...rest }, ref) {
  const combined: React.CSSProperties = {
    background: "var(--colors-surface)",
    color: "var(--colors-text-main)",
    borderRadius: "var(--radius-md)",
    ...style,
  };

  return (
    <div ref={ref} style={combined} {...rest}>
      {children}
    </div>
  );
});


// ----------------------
// CARD
// ----------------------
export function Card({
  children,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const combined: React.CSSProperties = {
    background: cssVar("colors-surface"),
    borderRadius: "var(--card-radius)",
    border: `1px solid ${cssVar("colors-border")}`,
    boxShadow: cssVar("shadows-medium"),
    ...style,
  };

  return (
    <div style={combined} {...rest}>
      {children}
    </div>
  );
}

export function CardContent({
  children,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        padding: "var(--card-padding)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-md)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ----------------------
// INPUT
// ----------------------
export function Input({
  style,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const s: React.CSSProperties = {
    width: "100%",
    padding: cssVar("spacing-md"),
    borderRadius: cssVar("radius-md"),
    border: `1px solid ${cssVar("colors-border")}`,
    background: cssVar("colors-background"),
    color: cssVar("colors-text-main"),
    ...style,
  };
  return <input style={s} {...rest} />;
}