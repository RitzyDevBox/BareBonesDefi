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
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedWidth = toCss(width);
  const resolvedMaxWidth = toCss(maxWidth);
  const resolvedMaxHeight = toCss(maxHeight);
  const resolvedHeight = height === "auto" ? "auto" : toCss(height as number | string);
  const isFixedBody = uxMode === UXMode.FixedBody;

  // Close on click only when the press starts AND ends on the scrim itself.
  // This avoids closing when the user clicks a portaled child (e.g. Select dropdown
  // options) that lives outside the modal box but isn't part of the backdrop.
  const handleScrimMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.dataset.scrimPress = "1";
    }
  };
  const handleScrimMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget.dataset.scrimPress === "1" && e.target === e.currentTarget) {
      onClose();
    }
    delete e.currentTarget.dataset.scrimPress;
  };

  return createPortal(
    <div
      onMouseDown={handleScrimMouseDown}
      onMouseUp={handleScrimMouseUp}
      style={{
        position: "fixed",
        inset: 0,
        // No `backdropFilter: blur(...)` here. It looks nice but every keystroke
        // inside the modal triggers a full-viewport recomposite of the blurred
        // backdrop, which made typing in long forms (proposal builder, earnings
        // schedule) feel laggy. Using a slightly darker plain scrim instead —
        // the mobile Sheet does the same and is noticeably snappier.
        background: "rgba(0,0,0,0.5)",
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
          // Modal portals to document.body which has no global text color set;
          // explicit color here keeps body text readable in dark mode.
          color: "var(--colors-text-main)",
          border: "1px solid var(--colors-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: isFixedBody ? resolvedMaxHeight : resolvedHeight,
          maxHeight: resolvedMaxHeight,
          // Promote to its own compositing layer so re-renders inside the modal
          // (typing, list updates) don't trigger a paint of the page beneath.
          willChange: "transform",
          transform: "translateZ(0)",
          contain: "layout paint",
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
