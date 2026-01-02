// Primitives/Tooltip.tsx
import React, { useState, useRef } from "react";

export function Tooltip({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  function show() {
    if (ref.current) {
      setRect(ref.current.getBoundingClientRect());
    }
  }

  function hide() {
    setRect(null);
  }

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{
          display: "inline-flex",
          alignItems: "center",
          cursor: "default",
          outline: "none",
        }}
      >
        {children}
      </span>

      {rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top - 8,
            left: rect.left + rect.width / 2,
            transform: "translate(-50%, -100%)",
            padding: "var(--spacing-xs) var(--spacing-sm)",
            background: "var(--colors-surface)",
            border: "1px solid var(--colors-border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.75rem",
            color: "var(--colors-text-main)",
            whiteSpace: "nowrap",
            zIndex: 10000,
            pointerEvents: "none",
            boxShadow: "var(--shadows-soft)",
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}
