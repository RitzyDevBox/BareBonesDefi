import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { ThemeMode } from "../../themes/theme";
import { useThemeMode } from "../../themes/useThemeMode";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { Sheet } from "../Primitives/Sheet";
import { Stack } from "../Primitives";
import { ButtonBase } from "../Button/ButtonBase";
import { IconButton } from "../Button/IconButton";
import { IS_DEMO_ENV, showStagingIntro } from "../Staging/StagingIntroModal";
import { PrivacyPolicyModal } from "./PrivacyPolicyModal";
import { useSettings, SettingsKey } from "../../hooks/useSettings";
import { FEATURE_FLAGS } from "../../constants/featureFlags";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "var(--colors-text-muted)",
        padding: "16px 0 2px",
      }}
    >
      {children}
    </div>
  );
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
  onClose,
}: Pick<SettingsModalProps, "showTestnets" | "onToggleTestnets"> & { onClose: () => void }) {
  // Local state for the policy modal lives here (not at the parent) so the
  // settings modal stays mounted underneath — closing the policy returns
  // the user to the settings view without re-opening the whole settings
  // modal. The policy modal portals to body and uses a higher z-index, so
  // it stacks over settings cleanly.
  const [policyOpen, setPolicyOpen] = useState(false);
  const { settings, toggle } = useSettings();
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
      {FEATURE_FLAGS.showFeatureToggles && (
        <>
          <SectionLabel>Features</SectionLabel>
          <SettingsRow
            title="Wallet"
            subtitle="Show the smart-account Wallet tab and its pages"
            right={
              <ToggleSwitch
                on={settings[SettingsKey.BasicWallet]}
                onChange={() => toggle(SettingsKey.BasicWallet)}
              />
            }
          />
          <SettingsRow
            title="Payments"
            subtitle="Show the Payments &amp; payroll tab and its pages"
            right={
              <ToggleSwitch
                on={settings[SettingsKey.Payments]}
                onChange={() => toggle(SettingsKey.Payments)}
              />
            }
          />
          <SettingsRow
            title="Vaults"
            subtitle="Show the Vaults tab and its pages"
            right={
              <ToggleSwitch
                on={settings[SettingsKey.Vaults]}
                onChange={() => toggle(SettingsKey.Vaults)}
              />
            }
          />
          <SettingsRow
            title="Cap Table"
            subtitle="Show the Cap Table tab and its pages"
            right={
              <ToggleSwitch
                on={settings[SettingsKey.CapTable]}
                onChange={() => toggle(SettingsKey.CapTable)}
              />
            }
          />
          <SettingsRow
            title="Distributions"
            subtitle="Show the Distributions tab in Payments (pay shareholders by ownership)"
            right={
              <ToggleSwitch
                on={settings[SettingsKey.Distributions]}
                onChange={() => toggle(SettingsKey.Distributions)}
              />
            }
          />
        </>
      )}
      {IS_DEMO_ENV && (
        <SettingsRow
          title="Demo intro"
          subtitle="Re-open the demo-environment warning + auto-faucet explainer"
          right={
            <ButtonBase
              shape="pill"
              onClick={() => {
                showStagingIntro();
                onClose();
              }}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 500,
                background: "var(--colors-surface)",
                color: "var(--colors-text-main)",
                border: "1px solid var(--colors-border)",
              }}
            >
              Show again
            </ButtonBase>
          }
        />
      )}
      <SettingsRow
        title="Privacy Policy"
        subtitle="How we collect, use, and disclose your information"
        right={
          <ButtonBase
            shape="pill"
            onClick={() => setPolicyOpen(true)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              background: "var(--colors-surface)",
              color: "var(--colors-text-main)",
              border: "1px solid var(--colors-border)",
            }}
          >
            View
          </ButtonBase>
        }
      />
      <PrivacyPolicyModal
        isOpen={policyOpen}
        onClose={() => setPolicyOpen(false)}
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
          <SettingsBody showTestnets={showTestnets} onToggleTestnets={onToggleTestnets} onClose={onClose} />
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
        // No backdropFilter — same perf reason as Modal.tsx; see that file's comment.
        background: "rgba(0,0,0,0.5)",
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
          <SettingsBody showTestnets={showTestnets} onToggleTestnets={onToggleTestnets} onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body
  );
}
