import { useState } from "react";
import { APP_NAME } from "../../constants/misc";
import { shortAddress } from "../../utils/formatUtils";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { IconButton } from "../Button/IconButton";
import { ChainSelector } from "./ChainSelector";
import { BareBonesLogo } from "./BareBonesLogo";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { NAV_ITEMS } from "./navConfig";
import { HamburgerMenu } from "./HamburgerMenu";
import { SettingsModal } from "../Settings/SettingsModal";
import { useSettings } from "../../hooks/useSettings";

interface HeaderProps {
  account: string | null;
  chainId: number | null;
  onConnectWallet: () => void;
  onChainChange: (chainId: number) => void;
}

const headerStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 100,
  borderBottom: "1px solid var(--colors-border)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  background: "color-mix(in oklab, var(--colors-background) 82%, transparent)",
};

const innerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0 24px",
  height: 60,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const brandStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  cursor: "pointer",
  background: "none",
  border: "none",
  color: "var(--colors-text-main)",
  padding: "6px 8px 6px 0",
  flexShrink: 0,
};


function GearButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton
      onClick={onClick}
      aria-label="Settings"
      title="Settings"
      size="xl"
      shape="rounded"
      style={{ color: "var(--colors-text-main)", fontSize: 15 }}
    >
      ⚙
    </IconButton>
  );
}

export function Header(props: HeaderProps) {
  const screen = useMediaQuery();
  const isCompact = screen === ScreenSize.Phone || screen === ScreenSize.Tablet;
  return isCompact ? <MobileHeader {...props} /> : <FullHeader {...props} />;
}

function WalletStatus({
  account,
  onConnectWallet,
}: {
  account: string | null;
  onConnectWallet: () => void;
}) {
  if (!account) {
    return (
      <ButtonPrimary size="sm" onClick={onConnectWallet}>
        Connect
      </ButtonPrimary>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 36,
        padding: "0 12px 0 10px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--colors-border)",
        background: "var(--colors-surface)",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--colors-text-main)",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background:
            "conic-gradient(from 210deg, #6b8cff, var(--colors-primary), #ff8fb3, #6b8cff)",
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: "monospace", fontSize: 13 }}>
        {shortAddress(account)}
      </span>
    </div>
  );
}

function NavLink({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 12px",
        fontSize: 14,
        fontWeight: 500,
        color: active ? "var(--colors-text-main)" : "var(--colors-text-muted)",
        background: active ? "var(--colors-surface)" : "transparent",
        border: "none",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        transition: "color .15s, background .15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function FullHeader({
  account,
  chainId,
  onConnectWallet,
  onChainChange,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, toggle } = useSettings();

  return (
    <>
      <header style={headerStyle}>
        <div style={innerStyle}>
          {/* Brand */}
          <button style={brandStyle} onClick={() => navigate("/")} aria-label={`${APP_NAME} home`}>

            <BareBonesLogo size={20} />
            <span>{APP_NAME}</span>
          </button>

          {/* Nav links */}
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.id}
                label={item.label}
                active={location.pathname === item.path || location.pathname.startsWith(item.path + "/")}
                onClick={() => navigate(item.path)}
              />
            ))}
          </div>

          {/* Right side */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {account && chainId !== null && (
              <ChainSelector
                chainId={chainId}
                onChainChange={onChainChange}
                showTestnets={settings.showTestnets}
              />
            )}
            <WalletStatus account={account} onConnectWallet={onConnectWallet} />
            <GearButton onClick={() => setSettingsOpen(true)} />
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showTestnets={settings.showTestnets}
        onToggleTestnets={() => toggle("showTestnets")}
      />
    </>
  );
}

function MobileHeader({
  account,
  chainId,
  onChainChange,
  onConnectWallet,
}: HeaderProps) {
  const navigate = useNavigate();
  const { settings, toggle } = useSettings();

  return (
    <header style={headerStyle}>
      <div style={innerStyle}>
        {/* Brand */}
        <button style={brandStyle} onClick={() => navigate("/")} aria-label={`${APP_NAME} home`}>
          <BareBonesLogo size={20} />
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {account && chainId !== null && (
            <ChainSelector
              chainId={chainId}
              onChainChange={onChainChange}
              showTestnets={settings.showTestnets}
              compact
            />
          )}
          <WalletStatus account={account} onConnectWallet={onConnectWallet} />
          <HamburgerMenu
            account={account}
            showTestnets={settings.showTestnets}
            onToggleTestnets={() => toggle("showTestnets")}
          />
        </div>
      </div>
    </header>
  );
}
