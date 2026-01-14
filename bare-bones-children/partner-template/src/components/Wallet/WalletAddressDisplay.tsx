// WalletAddressDisplay.tsx
import { Text } from "../Primitives/Text";
import { Row } from "../Primitives";
import { shortAddress } from "../../utils/formatUtils";

interface WalletAddressDisplayProps {
  address: string;
}

export function WalletAddressDisplay({ address }: WalletAddressDisplayProps) {
  return (
    <Row align="center" gap="xs">
      <Text.Body
        style={{
          fontSize: "0.75em",
          color: "var(--colors-text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        Wallet:
      </Text.Body>

      <Text.Body
        style={{
          fontSize: "0.8em",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {shortAddress(address)}
      </Text.Body>
    </Row>
  );
}
