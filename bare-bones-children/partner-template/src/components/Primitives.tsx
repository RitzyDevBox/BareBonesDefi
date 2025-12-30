import React from "react";

/**
 * --------------------------------------
 * Stack — vertical layout primitive
 * --------------------------------------
 */
export function Stack({
  children,
  gap = "md",
  align = "stretch",
  style,
}: {
  children: React.ReactNode;
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "stretch" | "start" | "center" | "end";
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `var(--spacing-${gap})`,
        alignItems: align === "start" ? "flex-start" :
                      align === "end" ? "flex-end" :
                      align === "center" ? "center" : "stretch",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * --------------------------------------
 * Row — horizontal layout primitive
 * --------------------------------------
 */
export function Row({
  children,
  gap = "sm",
  align = "center",
  justify = "start",
  wrap = false,
  style,
}: {
  children: React.ReactNode;
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems:
          align === "start" ? "flex-start" :
          align === "end" ? "flex-end" :
          "center",
        justifyContent:
          justify === "between" ? "space-between" :
          justify === "center" ? "center" :
          justify === "end" ? "flex-end" :
          "flex-start",
        gap: `var(--spacing-${gap})`,
        flexWrap: wrap ? "wrap" : "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * --------------------------------------
 * Surface — bordered background box
 * --------------------------------------
 */
export function Surface({
  children,
  clickable = false,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  clickable?: boolean;
}) {
  return (
    <div
      {...rest}
      style={{
        padding: "var(--spacing-md)",
        border: "1px solid var(--colors-border)",
        background: "var(--colors-background)",
        borderRadius: "var(--radius-md)",
        cursor: clickable ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * --------------------------------------
 * ClickableSurface — specialization
 * --------------------------------------
 */
export function ClickableSurface(
  props: React.HTMLAttributes<HTMLDivElement>
) {
  return <Surface clickable {...props} />;
}

/**
 * --------------------------------------
 * Center — simple centering helper
 * --------------------------------------
 */
export function Center({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface AmountInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
  > {
  value: string;
  onChange: (value: string) => void;
  decimals?: number; // optional token decimals
  align?: "left" | "right";
  placeholder?: string;
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0",
  align = "left",
}: AmountInputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode="decimal"
      style={{
        border: "none",
        outline: "none",
        background: "transparent",
        color: "var(--colors-text-main)",

        fontSize: "1.25rem",
        fontWeight: 600,

        // 🔑 layout knobs
        textAlign: align,
        flex: 1,
        minWidth: 0,

        appearance: "textfield",
      }}
    />
  );
}

