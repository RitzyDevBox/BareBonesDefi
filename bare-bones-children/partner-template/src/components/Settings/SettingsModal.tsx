import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { ThemeMode } from "../../themes/theme";
import { useThemeMode } from "../../themes/useThemeMode";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { Sheet } from "../Primitives/Sheet";
import { Stack } from "../Primitives";
import { ButtonBase } from "../Button/ButtonBase";
import { IconButton } from "../Button/IconButton";

interface ToggleSwitchProps {
  on: boolean;
  onChange: () => void;
}

function ToggleSwitch({ on, onChange }: ToggleSwitchProps) {
  return (
    <ButtonBase
      role="switch"
      aria-checked={on}
      onClick={onChange}
      shape="pill"
      style={{
        width: 36,
        height: 20,
        background: on ? "var(--colors-primary)" : "var(--colors-border)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "background .18s",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
          transition: "left .18s",
        }}
      />
    </ButtonBase>
  );
}

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  right: React.ReactNode;
}

function SettingsRow({ title, subtitle, right }: SettingsRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: "1px solid var(--colors-border)",
      }}
    >
      <div>
        <div style={{ fontWeight: 500, fontSize: 14, color: "var(--colors-text-main)" }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 13, color: "var(--colors-text-muted)", marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}

function ThemePill() {
  const { mode, toggle } = useThemeMode();

  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--colors-border)",
        borderRadius: 999,
        padding: 3,
        background: "var(--colors-background)",
        gap: 2,
      }}
    >
      {([ThemeMode.LIGHT, ThemeMode.DARK] as ThemeMode[]).map((m) => {
        const isActive = mode === m;
        return (
          <ButtonBase
            key={m}
            onClick={() => { if (!isActive) toggle(); }}
            shape="pill"
            style={{
              gap: 5,
              padding: "5px 12px",
              border: "none",
              background: isActive ? "var(--colors-surface)" : "transparent",
              color: isActive ? "var(--colors-text-main)" : "var(--colors-text-muted)",
              fontSize: 12,
              fontWeight: 500,
              transition: "background .15s, color .15s",
            }}
          >
            {m === ThemeMode.LIGHT ? "☀ Light" : "☽ Dark"}
          </ButtonBase>
        );
      })}
    </div>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showTestnets: boolean;
  onToggleTestnets: () => void;
}

function SettingsBody({
  showTestnets,
  onToggleTestnets,
}: Pick<SettingsModalProps, "showTestnets" | "onToggleTestnets">) {
  return (
    <Stack gap="none">
      <SettingsRow
        title="Appearance"
        subtitle="Choose between light and dark theme"
        right={<ThemePill />}
      />
      <SettingsRow
        title="Show Testnets"
        subtitle="Display testnet networks in the chain selector"
        right={<ToggleSwitch on={showTestnets} onChange={onToggleTestnets} />}
      />
    </Stack>
  );
}

export function SettingsModal({ isOpen, onClose, showTestnets, onToggleTestnets }: SettingsModalProps) {
  const screen = useMediaQuery();
  const isMobile = screen === ScreenSize.Phone || screen === ScreenSize.Tablet;
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    }
    function onOutsideClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onOutsideClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onOutsideClick);
    };
  }, [isOpen, isMobile, onClose]);

  if (!isOpen) return null;

  // On mobile — render as bottom sheet
  if (isMobile) {
    return (
      <Sheet placement="bottom" open={isOpen} onClose={onClose}>
        <div style={{ paddingBottom: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--colors-text-main)" }}>
              Settings
            </span>
            <IconButton
              onClick={onClose}
              aria-label="Close settings"
              size="sm"
              shape="rounded"
              style={{ border: "none", background: "transparent", color: "var(--colors-text-muted)" }}
            >
              ✕
            </IconButton>
          </div>
          <SettingsBody showTestnets={showTestnets} onToggleTestnets={onToggleTestnets} />
        </div>
      </Sheet>
    );
  }

  // Desktop — render as centred modal with lighter scrim
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 9000,
      }}
    >
      <div
        ref={wrapperRef}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--colors-surface)",
          border: "1px solid var(--colors-border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadows-medium)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid var(--colors-border)",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--colors-text-main)" }}>
            Settings
          </span>
          <IconButton
            onClick={onClose}
            aria-label="Close settings"
            size="sm"
            shape="rounded"
            style={{ border: "none", background: "transparent", color: "var(--colors-text-muted)" }}
          >
            ✕
          </IconButton>
        </div>

        {/* Body */}
        <div style={{ padding: "0 22px 4px" }}>
          <SettingsBody showTestnets={showTestnets} onToggleTestnets={onToggleTestnets} />
        </div>
      </div>
    </div>,
    document.body
  );
}
