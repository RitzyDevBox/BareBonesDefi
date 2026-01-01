import { APP_NAME } from "../../constants/misc";
import { ThemeToggle } from "../../themes/ThemeToggle";
import { shortAddress } from "../../utils/formatUtils";
import { Text } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { ChainSelector } from "./ChainSelector";
import { Row, Surface } from "../Primitives";

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
  return (
    <Surface
      as="header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: "1px solid var(--colors-border)",
        padding: "var(--spacing-sm) var(--spacing-md)", // 👈 slimmer
      }}
    >
      <Row
        justify="between"
        align="center"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* LEFT — brand */}
        <Text.Body
          style={{
            fontWeight: 600,
            letterSpacing: "0.2px",
          }}
        >
          {APP_NAME}
        </Text.Body>

        {/* RIGHT — controls */}
        <Row gap="sm" align="center">
          {account && chainId !== null && (
            <ChainSelector
              chainId={chainId}
              onChainChange={onChainChange}
            />
          )}

          <ThemeToggle />

          {!account ? (
            <ButtonPrimary
              size="sm"          // 👈 assume ButtonPrimary supports size
              onClick={onConnectWallet}
            >
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
