// components/Vault/VaultSelector.tsx
import { Text } from "../Primitives/Text";
import { shortAddress } from "../../utils/formatUtils";
import { GridItem, GridSelector } from "../Selector/CardGridSelector";
import { useWalletVaults } from "../../hooks/vaults/useWalletVaults";
import { useWalletProvider } from "../../hooks/useWalletProvider";

interface VaultSelectorProps {
  walletAddress: string;
  onSelect: (vaultAddress: string) => void;
  footer?: React.ReactNode;
}

export function VaultSelector({
  walletAddress,
  onSelect,
  footer,
}: VaultSelectorProps) {
  const { provider, chainId } = useWalletProvider();

  const {
    vaults,
    loading,
    hasVaults,
  } = useWalletVaults(provider, chainId, walletAddress);

  if (loading) {
    return <Text.Body>Loading vaults…</Text.Body>;
  }

  if (!hasVaults) {
    return (
      <>
        <Text.Body color="muted">
          No vaults found for this wallet.
        </Text.Body>
        {footer}
      </>
    );
  }

  const items: GridItem[] = vaults.map((address, index) => ({
    id: address,
    content: (
      <>
        <Text.Title style={{ fontSize: "1.1rem" }}>
          Vault #{index}
        </Text.Title>
        <Text.Body
          style={{
            fontSize: "0.75em",
            color: "var(--colors-text-muted)",
          }}
        >
          {shortAddress(address)}
        </Text.Body>
      </>
    ),
  }));

  return (
    <GridSelector
      items={items}
      onSelect={(item) => onSelect(item.id)}
      footer={footer}
    />
  );
}
