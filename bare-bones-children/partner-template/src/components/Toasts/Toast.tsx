import React, { useEffect, useState } from "react";
import { ToastConfig, ToastBehavior, ToastType } from "./toast.types";
import { Text } from "../Primitives/Text"
import { ClickableSurface, Stack } from "../Primitives";
import { CloseButton } from "../Modal/Modal";

const typeColorVar: Record<ToastType, string> = {
  [ToastType.Success]: "colors-success",
  [ToastType.Warn]: "colors-warn",
  [ToastType.Error]: "colors-error",
  [ToastType.Info]: "colors-secondary",
};

const FADE_MS = 200;

interface ToastProps {
  toast: ToastConfig;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const beginClose = () => {
    setVisible(false);
    setTimeout(() => onClose(toast.id), FADE_MS);
  };

  useEffect(() => {
    if (toast.behavior !== ToastBehavior.AutoClose) return;

    const duration = toast.durationMs ?? 4000;
    const timer = setTimeout(beginClose, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    beginClose();
  };

  return (
    <ClickableSurface
      onClick={toast.onClick}
      style={{
        background: `var(--${typeColorVar[toast.type]})`,
        color: "#fff",

        // ✅ ADD THIS BACK
        padding: "var(--spacing-sm)",

        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1),
          transform ${FADE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)
        `,
        cursor: toast.onClick ? "pointer" : "default",
        position: "relative",
      }}
    >
      <CloseButton
        onClick={handleClose}
        size="sm"
        style={{
          top: "var(--spacing-xs)",
          right: "var(--spacing-xs)",
          color: "#fff",
        }}
      />
      <Stack gap="xs">
        <Text.Label style={{ color: "#fff" }}>
          {toast.title}
        </Text.Label>

        {toast.message && (
          <Text.Body style={{ margin: 0, color: "#fff" }}>
            {toast.message}
          </Text.Body>
        )}
      </Stack>
    </ClickableSurface>
  );
}
