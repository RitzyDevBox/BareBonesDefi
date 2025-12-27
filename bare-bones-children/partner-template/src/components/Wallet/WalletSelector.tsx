import { Box, Text } from "../../components/BasicComponents";
import { computeDiamondAddress } from "../../utils/computeDiamondAddress";
import { useUserWalletCount } from "../../hooks/wallet/useUserWalletCount";
import { useShimWallet } from "../../hooks/useShimWallet";
import { shortAddress } from "../../utils/formatUtils";


export function WalletSelector({
  onSelect,
}: {
  onSelect: (address: string, index: number) => void;
}) {
  const { account } = useShimWallet();
  const walletCount = useUserWalletCount();
  if (!account) {
    return <Text.Body>Please connect your wallet.</Text.Body>;
  }

  if (walletCount === null) {
    return <Text.Body>Loading wallets…</Text.Body>;
  }

  if (walletCount === 0) {
    return <Text.Body>No wallets deployed yet.</Text.Body>;
  }

  return (
    <Box
      style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: "var(--spacing-md)",
          maxWidth: "min(90vw, 420px)",
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