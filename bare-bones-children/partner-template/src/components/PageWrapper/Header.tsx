import { APP_NAME } from "../../constants/misc";
import { ThemeToggle } from "../../themes/ThemeToggle";
import { shortAddress } from "../../utils/formatUtils";
import { Text } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { ChainSelector } from "./ChainSelector";

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
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--colors-surface)",
        borderBottom: "1px solid var(--colors-border)",
        padding: "var(--spacing-md)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-md)",
          flexWrap: "wrap",
        }}
      >
        {/* Left */}
        <div style={{ flex: "1 1 auto" }}>
          <Text.Title style={{ textAlign: "left" }}>
            {APP_NAME}
          </Text.Title>
        </div>

        {/* Right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-sm)",
            flex: "0 0 auto",
          }}
        >
          {account && chainId !== null && (
            <ChainSelector
              chainId={chainId}
              onChainChange={onChainChange}
            />
          )}

          <ThemeToggle />

          {!account ? (
            <ButtonPrimary
              onClick={onConnectWallet}
              style={{ width: "auto" }}
            >
              Connect Wallet
            </ButtonPrimary>
          ) : (
            <Text.Label>
              {shortAddress(account)}
            </Text.Label>
          )}
        </div>
      </div>
    </header>
  );
}
