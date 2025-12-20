import React, { useEffect, useState } from "react";
import { ToastConfig, ToastBehavior, ToastType } from "./toast.types";
import { Card, Text } from "../BasicComponents";

const typeColorVar: Record<ToastType, string> = {
  [ToastType.Success]: "colors-success",
  [ToastType.Error]: "colors-error",
  [ToastType.Info]: "colors-secondary",
};

interface ToastProps {
  toast: ToastConfig;
  onClose: (id: string) => void;
}

const FADE_MS = 200;

export function Toast({ toast, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  // fade in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // auto close w/ fade out
  useEffect(() => {
    if (toast.behavior !== ToastBehavior.AutoClose) return;

    const closeTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(toast.id), FADE_MS);
    }, toast.durationMs ?? 4000);

    return () => clearTimeout(closeTimer);
  }, [toast, onClose]);

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVisible(false);
    setTimeout(() => onClose(toast.id), FADE_MS);
  };

  return (
    <Card
      onClick={toast.onClick}
      style={{
        width: "100%",
        cursor: toast.onClick ? "pointer" : "default",
        background: `var(--${typeColorVar[toast.type]})`,
        color: "#fff",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-4px)",
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        position: "relative",
      }}
    >
      {/* CLOSE BUTTON */}
      <button
        onClick={handleClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: "16px",
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ×
      </button>

      <Text.Label style={{ color: "#fff" }}>
        {toast.title}
      </Text.Label>

      {toast.message && (
        <Text.Body style={{ margin: 0, color: "#fff" }}>
          {toast.message}
        </Text.Body>
      )}
    </Card>
  );
}
