import { APP_NAME } from "../../constants/misc";
import { ThemeToggle } from "../../themes/ThemeToggle";
import { shortAddress } from "../../utils/formatUtils";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { ChainSelector } from "./ChainSelector";
import { Row, Surface } from "../Primitives";
import { BareBonesLogo } from "./BareBonesLogo";
import { Text } from "../Primitives/Text";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { NAV_ITEMS } from "./navConfig";
import { HamburgerMenu } from "./HamburgerMenu";


interface HeaderProps {
  account: string | null;
  chainId: number | null;
  onConnectWallet: () => void;
  onChainChange: (chainId: number) => void;
}

const headerStyle = {
  position: "sticky" as const,
  top: 0,
  zIndex: 100,
  borderBottom: "1px solid var(--colors-border)",
  padding: "var(--spacing-sm) var(--spacing-md)",
};

const containerStyle = {
  maxWidth: 1200,
  margin: "0 auto",
  gap: "var(--spacing-md)",
};

const logoStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
};

export function Header(props: HeaderProps) {
  const screen = useMediaQuery();

  const isCompact =
    screen === ScreenSize.Phone || screen === ScreenSize.Tablet;

  return isCompact ? (
    <MobileHeader {...props} />
  ) : (
    <FullHeader {...props} />
  );
}

function WalletStatus({
  account,
  onConnectWallet,
}: {
  account: string | null;
  onConnectWallet: () => void;
}) {
  return !account ? (
    <ButtonPrimary size="sm" onClick={onConnectWallet}>
      Connect
    </ButtonPrimary>
  ) : (
    <Text.Body style={{ fontSize: "0.85em" }}>
      {shortAddress(account)}
    </Text.Body>
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

  return (
    <Surface as="header" style={headerStyle}>
      <Row justify="between" align="center" style={containerStyle}>
        {/* LEFT */}
        <Row gap="md" align="center">
          <Surface clickable onClick={() => navigate("/")} style={logoStyle}>
            <BareBonesLogo size={28} />
            <Text.Body style={{ fontWeight: 600 }}>
              {APP_NAME}
            </Text.Body>
          </Surface>

          <Row gap="sm">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path;

              return (
                <Surface
                  key={item.id}
                  clickable
                  onClick={() => navigate(item.path)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "var(--radius-md)",
                    background: active
                      ? "var(--colors-surfaceHover)"
                      : "transparent",
                  }}
                >
                  <Text.Body style={{ fontWeight: active ? 600 : 500 }}>
                    {item.label}
                  </Text.Body>
                </Surface>
              );
            })}
          </Row>
        </Row>

        {/* RIGHT */}
        <Row gap="sm" align="center">
          {account && chainId !== null && (
            <ChainSelector
              chainId={chainId}
              onChainChange={onChainChange}
            />
          )}

          <WalletStatus account={account} onConnectWallet={onConnectWallet} />
          <ThemeToggle />
        </Row>
      </Row>
    </Surface>
  );
}

function MobileHeader({
  account,
  chainId,
  onChainChange,
  onConnectWallet,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <Surface as="header" style={headerStyle}>
      <Row justify="between" align="center" style={containerStyle}>
        {/* LEFT */}
        <Surface clickable onClick={() => navigate("/")} style={logoStyle}>
          <BareBonesLogo size={28} />
        </Surface>

        {/* RIGHT */}
        <Row gap="sm" align="center">
          {account && chainId !== null && (
            <ChainSelector
              chainId={chainId}
              onChainChange={onChainChange}
            />
          )}
          <WalletStatus account={account} onConnectWallet={onConnectWallet} />
          <HamburgerMenu account={account} />
        </Row>
      </Row>
    </Surface>
  );
}
