import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ModalProps, UXMode } from "./models";
import { IconButton } from "../Button/IconButton";

function toCss(val: number | string): string {
  return typeof val === "number" ? `${val}px` : val;
}

export function CloseButton({
  onClick,
  style,
}: {
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <IconButton
      onClick={onClick}
      aria-label="Close"
      size="sm"
      shape="rounded"
      style={{
        border: "none",
        background: "transparent",
        color: "var(--colors-text-muted)",
        ...style,
      }}
    >
      ✕
    </IconButton>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,

  width = "auto",
  maxWidth = "90vw",
  height = "auto",
  maxHeight = "90vh",

  uxMode = UXMode.Default,
}: ModalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedWidth = toCss(width);
  const resolvedMaxWidth = toCss(maxWidth);
  const resolvedMaxHeight = toCss(maxHeight);
  const resolvedHeight = height === "auto" ? "auto" : toCss(height as number | string);
  const isFixedBody = uxMode === UXMode.FixedBody;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "var(--spacing-lg)",
        zIndex: 9999,
      }}
    >
      <div
        ref={wrapperRef}
        style={{
          width: resolvedWidth,
          maxWidth: resolvedMaxWidth,
          background: "var(--colors-surface)",
          border: "1px solid var(--colors-border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadows-medium)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: isFixedBody ? resolvedMaxHeight : resolvedHeight,
          maxHeight: resolvedMaxHeight,
        }}
      >
        {/* Header row — always rendered so CloseButton has a home */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: title ? "1px solid var(--colors-border)" : undefined,
            flexShrink: 0,
          }}
        >
          {title ? (
            <span
              style={{
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "var(--colors-text-main)",
              }}
            >
              {title}
            </span>
          ) : (
            <span />
          )}
          <CloseButton onClick={onClose} />
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowX: "hidden",
            overflowY: isFixedBody ? "hidden" : "auto",
            padding: "var(--modal-padding, var(--spacing-lg))",
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
