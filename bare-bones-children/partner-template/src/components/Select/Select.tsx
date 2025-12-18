/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import { useListNavigation } from "../../hooks/useListNavigation";

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
  const headRef = useRef<HTMLDivElement>(null);

  // Convert children → array of React elements
  const options = React.Children.toArray(children).filter((c) =>
    React.isValidElement(c)
  ) as React.ReactElement[];

  // -------------------------
  // Keyboard Navigation Logic
  // -------------------------
  const { highlightIndex, handleKeyDown } = useListNavigation({
    items: options,
    isOpen: open,
    onOpenChange: setOpen,
    onSelect: (opt) => {
      const v = opt.props.value as T;
      onChange(v);
    },
  });

  // -------------------------
  // Close when clicking outside
  // -------------------------
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

  // -------------------------
  // Make head tabbable + focus ring
  // -------------------------
  useEffect(() => {
    if (headRef.current) headRef.current.tabIndex = 0;
  }, []);

  const applyFocusRing = () => {
    if (headRef.current)
      headRef.current.style.boxShadow = "0 0 0 2px var(--colors-primary)";
  };

  const removeFocusRing = () => {
    if (headRef.current)
      headRef.current.style.boxShadow = "none";
  };

  // -------------------------
  // RENDER
  // -------------------------
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
        ref={headRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={applyFocusRing}
        onBlur={removeFocusRing}
        style={{
          padding: "var(--spacing-md)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--colors-border)",
          background: "var(--colors-background)",
          color: "var(--colors-text-main)",
          cursor: "pointer",
          userSelect: "none",
          outline: "none",
          transition: "box-shadow 0.15s ease",
        }}
        onClick={() => {
          setOpen((o) => !o);
        }}
      >
        {value ? (
          <span>{value}</span>
        ) : (
          <span style={{ color: "var(--colors-text-muted)" }}>
            {placeholder}
          </span>
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
          {options.map((opt, i) =>
            React.cloneElement(opt, {
              onSelect: (v: T) => {
                onChange(v);
                setOpen(false);
              },
              highlighted: i === highlightIndex,
            })
          )}
        </div>
      )}
    </div>
  );
}
