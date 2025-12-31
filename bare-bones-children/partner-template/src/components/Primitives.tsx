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

type SurfaceProps<E extends React.ElementType = "div"> = {
  as?: E;
  clickable?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<E>, "as" | "style" | "children">;

export function Surface<E extends React.ElementType = "div">({
  as,
  clickable = false,
  style,
  children,
  ...rest
}: SurfaceProps<E>) {
  const Component = as ?? "div";

  return (
    <Component
      {...rest}
      data-clickable={clickable ? "true" : undefined}
      style={{
        padding: "var(--spacing-md)",
        background: "var(--surface-bg)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-md)",
        cursor: clickable ? "pointer" : undefined,
        transition:
          clickable
            ? "background-color 120ms ease, border-color 120ms ease, transform 80ms ease"
            : undefined,
        ...style, // caller wins
      }}
    >
      {children}
    </Component>
  );
}

/**
 * --------------------------------------
 * ClickableSurface — specialization
 * --------------------------------------
 */
export function ClickableSurface<E extends React.ElementType = "div">(
  props: SurfaceProps<E>
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
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Allow:
    // - empty
    // - digits
    // - one optional decimal point
    // - decimals after the point
    if (/^\d*\.?\d*$/.test(raw)) {
      onChange(raw);
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      style={{
        border: "none",
        outline: "none",
        background: "transparent",
        color: "var(--colors-text-main)",
        fontSize: "1.25rem",
        fontWeight: 600,
        textAlign: align,
        flex: 1,
        minWidth: 0,
        appearance: "textfield",
      }}
    />
  );
}
