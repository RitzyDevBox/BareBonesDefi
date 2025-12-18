/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";


// Utility for CSS var fallback
const cssVar = (name: string) => `var(--${name})`;

// ----------------------
// BOX
// ----------------------
export function Box({
  children,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const combined: React.CSSProperties = {
    background: cssVar("colors-surface"),
    color: cssVar("colors-text-main"),
    borderRadius: cssVar("radius-md"),
    ...style,
  };
  return (
    <div style={combined} {...rest}>
      {children}
    </div>
  );
}

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

// ----------------------
// BUTTON
// ----------------------
export function ButtonPrimary({
  children,
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const s: React.CSSProperties = {
    width: "100%",
    padding: cssVar("spacing-md"),
    borderRadius: cssVar("radius-md"),
    background: cssVar("colors-primary"),
    color: "#fff",
    border: "none",
    cursor: "pointer",
    ...style,
  };
  return (
    <button style={s} {...rest}>
      {children}
    </button>
  );
}
