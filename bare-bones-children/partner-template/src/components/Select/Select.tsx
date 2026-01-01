/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import { useListNavigation } from "../../hooks/useListNavigation";
import { Text } from "../BasicComponents";

export enum DropdownAlignment {
  RIGHT = "RIGHT",
  LEFT = "LEFT"
}

export function Select<T extends string | number>({
  value,
  onChange,
  children,
  placeholder = "Select...",
  style,
  dropdownAlignment,
  renderValue,
}: {
  value: T | null;
  onChange: (v: T) => void;
  children: React.ReactNode;
  placeholder?: string;
  style?: React.CSSProperties;
  dropdownAlignment?: DropdownAlignment
  renderValue?: (opt: React.ReactElement | null) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);

  const options = React.Children.toArray(children).filter((c) =>
    React.isValidElement(c)
  ) as React.ReactElement[];

  const selectedOption =
    options.find((o) => o.props.value === value) ?? null;

  // -------------------------
  // Keyboard Navigation
  // -------------------------
  const { highlightIndex, handleKeyDown } = useListNavigation({
    items: options,
    isOpen: open,
    onOpenChange: setOpen,
    onSelect: (opt) => {
      onChange(opt.props.value as T);
    },
  });

  // -------------------------
  // Close on outside click
  // -------------------------
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // -------------------------
  // Focus ring
  // -------------------------
  useEffect(() => {
    if (headRef.current) headRef.current.tabIndex = 0;
  }, []);


  const align = dropdownAlignment ?? DropdownAlignment.LEFT

  const applyFocusRing = () => {
    headRef.current!.style.boxShadow =
      "0 0 0 2px var(--colors-primary)";
  };

  const removeFocusRing = () => {
    headRef.current!.style.boxShadow = "none";
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
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--spacing-sm)",
          padding: "var(--spacing-md)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--colors-border)",
          background: "var(--colors-background)",
          color: "var(--colors-text-main)",
          cursor: "pointer",
          userSelect: "none",
          outline: "none",
        }}
      >
        {/* Value */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {selectedOption
            ? renderValue
              ? renderValue(selectedOption)
              : selectedOption.props.label ?? selectedOption.props.value
            : (
              <span style={{ color: "var(--colors-text-muted)" }}>
                {placeholder}
              </span>
            )}
        </div>

        {/* Chevron */}
        <Text.Label
          style={{
            fontSize: 12,
            opacity: 0.6,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          ▼
        </Text.Label>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            ...(align === DropdownAlignment.LEFT
              ? { left: 0 }
              : { right: 0 }),
            minWidth: "100%",
            width: "max-content",
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
