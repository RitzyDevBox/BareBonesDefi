import { useState } from "react";
import { APP_NAME } from "../../constants/misc";
import { shortAddress } from "../../utils/formatUtils";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { IconButton } from "../Button/IconButton";
import { ChainSelector } from "./ChainSelector";
import { BareBonesLogo } from "./BareBonesLogo";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { useNavItems } from "./navConfig";
import { HamburgerMenu } from "./HamburgerMenu";
import { SettingsModal } from "../Settings/SettingsModal";
import { useSettings, SettingsKey } from "../../hooks/useSettings";
import { DaoSwitcher } from "../Header/DaoSwitcher";
import { CreateDaoModal } from "../Header/CreateDaoModal";
import { WalletAccountSheet } from "./WalletAccountSheet";
import { ContextPill } from "./ContextPill";

interface HeaderProps {
  account: string | null;
  chainId: number | null;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void | Promise<void>;
  onChainChange: (chainId: number) => void;
}

const headerStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 100,
  borderBottom: "1px solid var(--colors-border)",
  // No `backdropFilter: blur(...)` — the AppBackground runs an rAF canvas
  // animation; combining it with a blurred header forces a full-viewport
  // re-composite every animation frame, which compounds with any open
  // modal/scrim's compositing work and shows up as input lag.
  background: "var(--colors-background)",
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
  // Collapse to the unified mobile header below 1210px — the full split layout
  // (DAO switcher + nav + chain selector + wallet pill) gets too cramped before
  // that. Below the threshold a single ContextPill replaces the three controls
  // so the user still sees their org / chain / wallet at a glance.
  const screen = useMediaQuery({ tabletMax: 1210 });
  const isCompact = screen === ScreenSize.Phone || screen === ScreenSize.Tablet;
  return isCompact ? <MobileHeader {...props} /> : <FullHeader {...props} />;
}

function WalletStatus({
  account,
  onConnectWallet,
  onClick,
}: {
  account: string | null;
  onConnectWallet: () => void;
  /** When set, the account pill becomes a button that opens (e.g.) the mobile wallet sheet. */
  onClick?: () => void;
}) {
  if (!account) {
    return (
      <ButtonPrimary size="sm" onClick={onConnectWallet}>
        Connect
      </ButtonPrimary>
    );
  }

  const baseStyle: React.CSSProperties = {
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
  };

  const pillContent = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Open account, network, and organization"
        style={{ ...baseStyle, cursor: "pointer", fontFamily: "inherit" }}
      >
        {pillContent}
      </button>
    );
  }

  return <div style={baseStyle}>{pillContent}</div>;
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
  onDisconnectWallet,
  onChainChange,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);
  const { settings, toggle } = useSettings();
  const navItems = useNavItems();

  return (
    <>
      <header style={headerStyle}>
        <div style={innerStyle}>
          {/* Brand */}
          <button style={brandStyle} onClick={() => navigate("/")} aria-label={`${APP_NAME} home`}>

            <BareBonesLogo size={40} />
            <span>{APP_NAME}</span>
          </button>

          {/* Nav links */}
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                label={item.label}
                active={location.pathname === item.path || location.pathname.startsWith(item.path + "/")}
                onClick={() => navigate(item.path)}
              />
            ))}
          </div>

          {/* Right side — DAO / chain / wallet kept adjacent so the visual
              grouping carries over to the mobile ContextPill that merges them. */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {account && <DaoSwitcher onCreate={() => setCreateOpen(true)} />}
            <ChainSelector
              chainId={chainId}
              onChainChange={onChainChange}
              showTestnets={settings.showTestnets}
              connected={!!account}
            />
            <WalletStatus
              account={account}
              onConnectWallet={onConnectWallet}
              onClick={account ? () => setWalletPanelOpen(true) : undefined}
            />
            <GearButton onClick={() => setSettingsOpen(true)} />
          </div>
        </div>
      </header>

      {account && (
        <WalletAccountSheet
          open={walletPanelOpen}
          onClose={() => setWalletPanelOpen(false)}
          account={account}
          chainId={chainId}
          onChainChange={onChainChange}
          showTestnets={settings.showTestnets}
          onCreateOrganization={() => setCreateOpen(true)}
          onDisconnect={onDisconnectWallet}
        />
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showTestnets={settings.showTestnets}
        onToggleTestnets={() => toggle(SettingsKey.ShowTestnets)}
      />

      <CreateDaoModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function MobileHeader({
  account,
  chainId,
  onChainChange,
  onConnectWallet,
  onDisconnectWallet,
}: HeaderProps) {
  const navigate = useNavigate();
  const { settings, toggle } = useSettings();
  const [createOpen, setCreateOpen] = useState(false);
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);

  // Below the desktop split-mode breakpoint we render a single unified
  // ContextPill that combines DAO + chain + wallet. Tapping it opens the
  // existing WalletAccountSheet, which already houses the chain picker, org
  // picker, faucet, explorer, and disconnect — so the pill stays as a single
  // tap target while still surfacing the user's current scope at a glance.

  return (
    <>
      <header style={headerStyle}>
        <div style={innerStyle}>
          {/* Brand — icon only on mobile, doubles as "home" affordance */}
          <button style={brandStyle} onClick={() => navigate("/")} aria-label={`${APP_NAME} home`}>
            <BareBonesLogo size={36} />
          </button>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <ContextPill
              account={account}
              chainId={chainId}
              onConnectWallet={onConnectWallet}
              onOpen={() => setWalletPanelOpen(true)}
            />
            <HamburgerMenu
              account={account}
              showTestnets={settings.showTestnets}
              onToggleTestnets={() => toggle(SettingsKey.ShowTestnets)}
            />
          </div>
        </div>
      </header>

      {account && (
        <WalletAccountSheet
          open={walletPanelOpen}
          onClose={() => setWalletPanelOpen(false)}
          account={account}
          chainId={chainId}
          onChainChange={onChainChange}
          showTestnets={settings.showTestnets}
          onCreateOrganization={() => setCreateOpen(true)}
          onDisconnect={onDisconnectWallet}
        />
      )}

      <CreateDaoModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
