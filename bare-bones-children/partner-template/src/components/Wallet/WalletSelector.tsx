import { Box } from "../../components/BasicComponents";
import { Text } from "../Primitives/Text";
import { computeDiamondAddress } from "../../utils/computeDiamondAddress";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { shortAddress } from "../../utils/formatUtils";
import { DeployDiamondWidget } from "../DeployWalletWidget";

interface WalletSelectorProps {
  walletCount: number;
  onSelect: (address: string, index: number) => void;
}

export function WalletSelector({
  walletCount,
  onSelect,
}: WalletSelectorProps) {
  const { account, chainId } = useWalletProvider();

  if (!account) {
    return <Text.Body>Please connect your wallet.</Text.Body>;
  }

  return (
    <Box>
      {/* Existing wallets */}
      {walletCount > 0 && (
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 96px)",
            gap: "var(--spacing-md)",
            marginBottom: "var(--spacing-lg)",
          }}
        >
          {Array.from({ length: walletCount }).map((_, index) => {
            const address = computeDiamondAddress(account, index, chainId);

            return (
              <Box
                key={index}
                onClick={() => onSelect(address, index)}
                style={{
                  padding: "var(--spacing-md)",
                  border: "1px solid var(--colors-border)",
                  cursor: "pointer",
                  textAlign: "center",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <Text.Title style={{ fontSize: "1.1rem" }}>
                  #{index}
                </Text.Title>

                <Text.Body
                  style={{
                    fontSize: "0.75em",
                    color: "var(--colors-text-muted)",
                  }}
                >
                  {shortAddress(address)}
                </Text.Body>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Deploy wallet — ALWAYS visible */}
      <DeployDiamondWidget
        onDeployed={(address, index) => {
          onSelect(address, index);
        }}
      />
    </Box>
  );
}
