import React, { useEffect, useRef } from "react";
import { Card, Text } from "../BasicComponents";
import { IconButton, IconButtonSize } from "../Button/IconButton";

/**
 * UXMode
 *
 * Default:
 * - Modal expands based on content
 * - Modal body scrolls if content exceeds maxHeight
 *
 * FixedBody:
 * - Modal height is constrained by maxHeight
 * - Modal body does NOT scroll
 * - Child components must manage their own scrolling
 */
export enum UXMode {
  Default = "default",
  FixedBody = "fixed-body",
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;

  width?: number | string;
  maxWidth?: number | string;

  height?: number | string;
  maxHeight?: number | string;

  uxMode?: UXMode;
}

function toCss(val: number | string): string {
  return typeof val === "number" ? `${val}px` : val;
}

export function CloseButton({
  onClick,
  style,
  size
}: {
  onClick: () => void;
  style?: React.CSSProperties;
  size?: IconButtonSize;
}) {
  return (
    <IconButton
      onClick={onClick}
      aria-label="Close"
      size={size}
      shape="square"
      style={{
        position: "absolute",
        top: "var(--spacing-md)",
        right: "var(--spacing-md)",
        zIndex: 2,
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

  // Close when clicking outside modal
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

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  const resolvedWidth = toCss(width);
  const resolvedMaxWidth = toCss(maxWidth);
  const resolvedMaxHeight = toCss(maxHeight);
  const resolvedHeight =
    height === "auto" ? "auto" : toCss(height as number | string);

  const isFixedBody = uxMode === UXMode.FixedBody;

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
            height: uxMode === UXMode.FixedBody ? resolvedMaxHeight : resolvedHeight,
            maxHeight: resolvedMaxHeight,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minHeight: 0,
            padding: 0, // 🔑 Card becomes a shell
          }}
        >
          <CloseButton size="lg" onClick={onClose} />
          {title && (
            <div
              style={{
                padding: "var(--spacing-md)",
                paddingBottom: "var(--spacing-sm)",
              }}
            >
              <Text.Title>{title}</Text.Title>
            </div>
          )}

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowX: "hidden",
              overflowY: isFixedBody ? "hidden" : "auto",
              padding: "var(--modal-padding)",
            }}
          >
            {children}
          </div>
        </Card>

      </div>
    </div>
  );
}
