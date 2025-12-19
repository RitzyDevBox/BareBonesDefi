import React, { useEffect, useRef } from "react";
import { Card, Text } from "../BasicComponents";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;

  width?: number | string;
  maxWidth?: number | string;

  height?: number | string;
  maxHeight?: number | string;
}

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
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        top: "var(--spacing-md)",
        right: "var(--spacing-md)",
        background: "none",
        border: "none",
        fontSize: 20,
        cursor: "pointer",
        color: "var(--colors-text-main)",
        zIndex: 2,
        ...style, // allow overrides
      }}
    >
      ✕
    </button>
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
}: ModalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the modal card
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedWidth = toCss(width);
  const resolvedMaxWidth = toCss(maxWidth);
  const resolvedMaxHeight = toCss(maxHeight);
  const resolvedHeight =
    height === "auto" ? "auto" : toCss(height as number | string);

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
        ref={wrapperRef}
        style={{
          width: resolvedWidth,
          maxWidth: resolvedMaxWidth,
        }}
      >
        <Card
          style={{
            width: "100%",
            height: resolvedHeight,      // "auto" or explicit height
            maxHeight: resolvedMaxHeight, // cap at 90vh by default
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minHeight: 0,
          }}
        >
          <CloseButton onClick={onClose} />
          
          {/* Title (static header area) */}
          {title && (
            <Text.Title
              style={{
                marginBottom: "var(--spacing-lg)",
                textAlign: "left",
              }}
            >
              {title}
            </Text.Title>
          )}

          {/* Scrollable body */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              scrollbarGutter: "stable",
              marginRight: "-8px",
              paddingRight: "8px",
            }}
          >
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
}
