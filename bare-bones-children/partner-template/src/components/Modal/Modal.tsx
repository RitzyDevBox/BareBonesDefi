import React, { useRef } from "react";
import { Card, Text } from "../BasicComponents";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  width?: number | string;
  maxWidth?: number | string;
}
// Utility to normalize width values for comparison
function toPx(val: string | number): number {
  if (typeof val === "number") return val;
  if (val.endsWith("px")) return parseFloat(val);
  return NaN; // not comparable (%, vw, rem)
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  width,
  maxWidth,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Compute responsive maxWidth
  const computedMaxWidth = (() => {
    if (maxWidth) {
      const px = toPx(maxWidth);

      // If px convertible, enforce min(px, 90vw)
      if (!isNaN(px)) {
        return `min(${px}px, 90vw)`;
      }

      // If not px (vw, %, rem) → still cap at 90vw
      return `min(${maxWidth}, 90vw)`;
    }

    // default case → modal grows with content up to 90vw
    return "90vw";
  })();

  // width: if caller passed a width → use it. If not → natural content width.
  const computedWidth = width ?? "auto";

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "var(--spacing-lg)",
        zIndex: 9999,
      }}
    >
      <div
        ref={cardRef}
        style={{
          width: computedWidth,
          maxWidth: computedMaxWidth,   // *** responsive max logic ***
        }}
      >
        <Card
          style={{
            width: "100%",
            padding: "var(--spacing-lg)",
            position: "relative",
          }}
        >
          {/* X button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "var(--spacing-md)",
              right: "var(--spacing-md)",
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "var(--colors-text-main)",
            }}
          >
            ✕
          </button>

          {title && (
            <Text.Title style={{ marginBottom: "var(--spacing-lg)", textAlign: "left" }}>
              {title}
            </Text.Title>
          )}

          {children}
        </Card>
      </div>
    </div>
  );
}
