import { Text } from "../Primitives/Text";
import { shortAddress } from "../../utils/formatUtils";
import { computeDiamondAddress } from "../../utils/computeDiamondAddress";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { DeployDiamondWidget } from "../DeployWalletWidget";
import { GridItem, GridSelector } from "../Selector/CardGridSelector";

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

  const walletItems: GridItem[] = Array.from({ length: walletCount }).map(
    (_, index) => {
      const address = computeDiamondAddress(account, index, chainId);

      return {
        id: address,
        content: (
          <>
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
          </>
        ),
      };
    }
  );

  return (
    <GridSelector
      items={walletItems}
      onSelect={(item, index) => onSelect(item.id, index)}
      footer={
        <DeployDiamondWidget
          onDeployed={(address, index) => onSelect(address, index)}
        />
      }
    />
  );
}
