import { APP_NAME } from "../../constants/misc";
import { ThemeToggle } from "../../themes/ThemeToggle";
import { shortAddress } from "../../utils/formatUtils";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { ChainSelector } from "./ChainSelector";
import { Row, Surface } from "../Primitives";
import { Logo } from "./Logo";
import { Text } from "../Primitives/Text";
import { Select } from "../Select/Select";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { NAV_ITEMS } from "./navConfig";
import { SelectOption } from "../Select";


interface HeaderProps {
  account: string | null;
  chainId: number | null;
  onConnectWallet: () => void;
  onChainChange: (chainId: number) => void;
}

export function Header({
  account,
  chainId,
  onConnectWallet,
  onChainChange,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const screen = useMediaQuery();

  const isCompact =
    screen === ScreenSize.Phone || screen === ScreenSize.Tablet;

  return (
    <Surface
      as="header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: "1px solid var(--colors-border)",
        padding: "var(--spacing-sm) var(--spacing-md)",
      }}
    >
      <Row
        justify="between"
        align="center"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          gap: "var(--spacing-md)",
        }}
      >
        {/* LEFT */}
        <Row gap="md" align="center">
          <Surface
            clickable
            onClick={() => navigate("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
            }}
          >
            <Logo size={28} />
            <Text.Body style={{ fontWeight: 600 }}>
              {APP_NAME}
            </Text.Body>
          </Surface>

          {/* NAV */}
          {isCompact ? (
            <Select
              value={location.pathname}
              onChange={(v) => navigate(v)}
              placeholder="Navigate"
              style={{ minWidth: 160 }}
            >
              {NAV_ITEMS.map((item) => (
                  <SelectOption
                    key={item.id}
                    value={item.path}
                    label={item.label}
                 />
              ))}
            </Select>
          ) : (
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
                    <Text.Body
                      style={{
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {item.label}
                    </Text.Body>
                  </Surface>
                );
              })}
            </Row>
          )}
        </Row>

        {/* RIGHT */}
        <Row gap="sm" align="center">
          {account && chainId !== null && (
            <ChainSelector
              chainId={chainId}
              onChainChange={onChainChange}
            />
          )}

          <ThemeToggle />

          {!account ? (
            <ButtonPrimary size="sm" onClick={onConnectWallet}>
              Connect
            </ButtonPrimary>
          ) : (
            <Text.Body
              style={{
                fontSize: "0.85em",
                color: "var(--colors-text-muted)",
              }}
            >
              {shortAddress(account)}
            </Text.Body>
          )}
        </Row>
      </Row>
    </Surface>
  );
}
