/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { forwardRef } from "react";

// Utility for CSS var fallback
const cssVar = (name: string) => `var(--${name})`;

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
    padding: cssVar("spacing-lg"),
    borderRadius: cssVar("radius-lg"),
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
        padding: "var(--spacing-lg)",
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
// TEXT
// ----------------------
export const Text = {
  Title({ children, style }: any) {
    return (
      <h3
        style={{
          fontSize: cssVar("textStyles-title-fontSize"),
          fontWeight: cssVar("textStyles-title-fontWeight"),
          margin: 0,
          color: cssVar("colors-text-main"),
          textAlign: "center",
          ...style,
        }}
      >
        {children}
      </h3>
    );
  },

  Label({ children, style }: any) {
    return (
      <label
        style={{
          fontSize: cssVar("textStyles-label-fontSize"),
          fontWeight: cssVar("textStyles-label-fontWeight"),
          color: cssVar("colors-text-label"),
          ...style,
        }}
      >
        {children}
      </label>
    );
  },

  Body({ children, style }: any) {
    return (
      <p
        style={{
          fontSize: cssVar("textStyles-body-fontSize"),
          color: cssVar("colors-text-main"),
          ...style,
        }}
      >
        {children}
      </p>
    );
  },
};

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