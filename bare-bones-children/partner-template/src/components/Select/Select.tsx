/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useListNavigation } from "../../hooks/useListNavigation";
import { DropdownAlignment } from "./models";
import { Text } from "../Primitives/Text";

export function Select<T extends string | number>({
  value,
  onChange,
  children,
  placeholder = "Select...",
  style,
  triggerStyle,
  dropdownAlignment,
  renderValue,
  disabled = false,
  compact = false,
}: {
  value: T | null;
  onChange: (v: T) => void;
  children: React.ReactNode;
  placeholder?: string;
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  dropdownAlignment?: DropdownAlignment;
  renderValue?: (opt: React.ReactElement | null) => React.ReactNode;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = React.Children.toArray(children).filter((c) =>
    React.isValidElement(c)
  ) as React.ReactElement[];

  const updateTriggerRect = React.useCallback(() => {
    if (!headRef.current) return;
    setTriggerRect(headRef.current.getBoundingClientRect());
  }, []);

  const selectedOption =
    options.find((o) => o.props.value === value) ?? null;

  const { highlightIndex, handleKeyDown } = useListNavigation({
    items: options,
    isOpen: open && !disabled,
    onOpenChange: (v) => !disabled && setOpen(v),
    onSelect: (opt) => {
      if (!disabled) onChange(opt.props.value as T);
    },
  });

  // Close on outside click — checks both wrapper and portaled dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        !wrapperRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keep dropdown anchored to trigger while scrolling/resizing
  useEffect(() => {
    if (!open) return;

    let rafId: number | null = null;
    const scheduleUpdate = () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        updateTriggerRect();
      });
    };

    window.addEventListener("scroll", scheduleUpdate, { capture: true, passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleUpdate, { capture: true });
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [open, updateTriggerRect]);

  // Focus handling
  useEffect(() => {
    if (headRef.current) {
      headRef.current.tabIndex = disabled ? -1 : 0;
    }
  }, [disabled]);

  const align = dropdownAlignment ?? DropdownAlignment.LEFT;

  const applyFocusRing = () => {
    if (disabled) return;
    headRef.current!.style.boxShadow = "0 0 0 2px var(--colors-primary)";
  };
  const removeFocusRing = () => {
    headRef.current!.style.boxShadow = "none";
  };

  // Compute dropdown position synchronously before paint whenever open changes
  useLayoutEffect(() => {
    if (open) updateTriggerRect();
  }, [open, updateTriggerRect]);

  function handleToggle() {
    if (disabled) return;
    setOpen((o) => !o);
  }

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", ...style }}
    >
      {/* Trigger */}
      <div
        ref={headRef}
        onKeyDown={(e) => { if (!disabled) handleKeyDown(e); }}
        onFocus={applyFocusRing}
        onBlur={removeFocusRing}
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--spacing-sm)",
          padding: compact ? "5px 10px 5px 12px" : "10px 10px 10px 14px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--colors-border)",
          background: "var(--colors-background)",
          color: "var(--colors-text-main)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          userSelect: "none",
          outline: "none",
          ...triggerStyle,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
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

        <Text.Label
          style={{
            fontSize: 10,
            opacity: 0.5,
            flexShrink: 0,
            marginLeft: 6,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          ▼
        </Text.Label>
      </div>

      {/* Portaled dropdown */}
      {open && !disabled && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: (triggerRect?.bottom ?? -9999) + 4,
            ...(align === DropdownAlignment.LEFT
              ? { left: triggerRect?.left ?? 0 }
              : { right: window.innerWidth - (triggerRect?.right ?? 0) }),
            minWidth: triggerRect?.width ?? 0,
            width: "max-content",
            background: "var(--colors-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--colors-border)",
            boxShadow: "var(--shadows-medium)",
            zIndex: 10000,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {options.map((opt, i) =>
            React.cloneElement(opt, {
              onSelect: (v: T) => {
                if (!disabled) {
                  onChange(v);
                  setOpen(false);
                }
              },
              highlighted: i === highlightIndex,
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
