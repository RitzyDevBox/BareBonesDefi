import { Box, Text } from "../../components/BasicComponents";
import { computeDiamondAddress } from "../../utils/computeDiamondAddress";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { shortAddress } from "../../utils/formatUtils";

interface WalletSelectorProps {
  walletCount: number;
  onSelect: (address: string, index: number) => void;
}

export function WalletSelector({
  walletCount,
  onSelect,
}: WalletSelectorProps) {
  const { account } = useWalletProvider();

  if (!account) {
    return <Text.Body>Please connect your wallet.</Text.Body>;
  }

  if (walletCount === 0) {
    // Selector should NOT render anything if there is nothing to select
    return null;
  }

  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 96px)",
        gap: "var(--spacing-md)",
        justifyContent: "flex-start",
      }}
    >
      {Array.from({ length: walletCount }).map((_, index) => {
        const address = computeDiamondAddress(account, index);

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
  );
}
