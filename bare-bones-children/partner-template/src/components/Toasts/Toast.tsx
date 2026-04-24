import React, { useEffect, useState } from "react";
import { ToastConfig, ToastBehavior, ToastType } from "./toast.types";
import { CopyButton } from "../Button/Actions/CopyButton";

const TONE_VAR: Record<ToastType, string> = {
  [ToastType.Success]: "var(--colors-success)",
  [ToastType.Warn]: "var(--colors-warn)",
  [ToastType.Error]: "var(--colors-error)",
  [ToastType.Info]: "var(--colors-secondary)",
};

const ICON: Record<ToastType, string> = {
  [ToastType.Success]: "✓",
  [ToastType.Warn]: "!",
  [ToastType.Error]: "✕",
  [ToastType.Info]: "i",
};

const FADE_MS = 200;

interface ToastProps {
  toast: ToastConfig;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const MAX_CHARS = 220;
  const message = toast.message ?? "";
  const displayMessage = message.length > MAX_CHARS ? `${message.slice(0, MAX_CHARS - 1)}…` : message;
  const tone = TONE_VAR[toast.type];

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const beginClose = () => {
    setVisible(false);
    setTimeout(() => onClose(toast.id), FADE_MS);
  };

  useEffect(() => {
    if (toast.behavior !== ToastBehavior.AutoClose) return;
    const timer = setTimeout(beginClose, toast.durationMs ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id]);

  const handleClose = (e?: React.MouseEvent) => { e?.stopPropagation(); beginClose(); };

  return (
    <div
      onClick={toast.onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "start",
        padding: "14px 14px 14px 16px",
        background: "var(--colors-surface)",
        border: "1px solid var(--colors-border)",
        borderLeft: `3px solid ${tone}`,
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadows-medium)",
        cursor: toast.onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.2,0.8,0.2,1), transform ${FADE_MS}ms cubic-bezier(0.2,0.8,0.2,1)`,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: tone,
          background: `color-mix(in oklab, ${tone} 15%, transparent)`,
          flexShrink: 0,
          marginTop: 1,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "monospace",
        }}
      >
        {ICON[toast.type]}
      </div>

      {/* Body */}
      <div>
        <div style={{ fontWeight: 500, fontSize: 14, color: "var(--colors-text-main)" }}>
          {toast.title}
        </div>
        {message && (
          <div
            title={message}
            style={{ color: "var(--colors-text-muted)", fontSize: 13, marginTop: 2, wordBreak: "break-word" }}
          >
            {displayMessage}
          </div>
        )}
      </div>

      {/* Close + copy */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        {message && <CopyButton value={message} />}
        <button
          onClick={handleClose}
          style={{
            width: 22,
            height: 22,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: "var(--colors-text-muted)",
            cursor: "pointer",
            fontSize: 12,
            transition: "color .15s, background .15s",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
