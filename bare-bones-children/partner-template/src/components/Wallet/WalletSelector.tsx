import { Box } from "../../components/BasicComponents";
import { Text } from "../Primitives/Text";
import { computeDiamondAddress } from "../../utils/computeDiamondAddress";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { shortAddress } from "../../utils/formatUtils";
import { DeployDiamondWidget } from "../DeployWalletWidget";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";

interface WalletSelectorProps {
  walletCount: number;
  onSelect: (address: string, index: number) => void;
}

export function WalletSelector({
  walletCount,
  onSelect,
}: WalletSelectorProps) {
  const { account, chainId } = useWalletProvider();
  const screen = useMediaQuery({ phoneMax: 520 });

  const isPhone = screen === ScreenSize.Phone;

  if (!account) {
    return <Text.Body>Please connect your wallet.</Text.Body>;
  }

  return (
    <Box>
      {walletCount > 0 && (
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: isPhone
              ? "repeat(2, 1fr)"
              : "repeat(3, 1fr)",
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
                  padding: isPhone
                    ? "var(--spacing-sm)"
                    : "var(--spacing-md)",
                  minHeight: isPhone ? 96 : 88,
                  border: "1px solid var(--colors-border)",
                  cursor: "pointer",
                  textAlign: "center",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "var(--spacing-xs)",
                }}
              >
                <Text.Title style={{ fontSize: "1.1rem" }}>
                  #{index}
                </Text.Title>
                <Text.Body
                  style={{
                    fontSize: "0.75em",
                    color: "var(--colors-text-muted)",
                    textAlign: "center",
                  }}
                >
                  {shortAddress(address)}
                </Text.Body>
              </Box>
            );
          })}
        </Box>
      )}

      <DeployDiamondWidget
        onDeployed={(address, index) => {
          onSelect(address, index);
        }}
      />
    </Box>
  );
}
