/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";

export function Select<T extends string | number>({
  value,
  onChange,
  children,
  placeholder = "Select...",
  style,
}: {
  value: T | null;
  onChange: (v: T) => void;
  children: React.ReactNode;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
        ...style,
      }}
    >
      {/* Select Head */}
      <div
        style={{
          padding: "var(--spacing-md)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--colors-border)",
          background: "var(--colors-background)",
          color: "var(--colors-text-main)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {value ? (
          <span>{value}</span>
        ) : (
          <span style={{ color: "var(--colors-text-muted)" }}>{placeholder}</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            background: "var(--colors-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--colors-border)",
            boxShadow: "var(--shadows-soft)",
            zIndex: 1000,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;

            return React.cloneElement(child, {
              onSelect: (v: T) => {
                onChange(v);
                setOpen(false);
              },
              selected: value,
            });
          })}
        </div>
      )}
    </div>
  );
}
