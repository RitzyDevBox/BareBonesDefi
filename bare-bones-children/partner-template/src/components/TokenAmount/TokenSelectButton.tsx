import { Text } from "../Primitives/Text";
import { Row, ClickableSurface } from "../Primitives";
import { TokenInfo } from "../TokenSelect/types";
import { TokenAvatar } from "./TokenAvatar";

interface TokenSelectButtonProps {
  token: TokenInfo | null;
  disabled?: boolean;
  onClick?: () => void;
}

export function TokenSelectButton({
  token,
  disabled = false,
  onClick,
}: TokenSelectButtonProps) {
  return (
    <ClickableSurface
      as="button"
      type="button"
      onClick={!disabled ? onClick : undefined}
      style={{
        padding: "var(--spacing-xs)",
        borderRadius: "999px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Row gap="xs" align="center">
        <TokenAvatar src={token?.logoURI} alt={token?.symbol} size={28} />
        <Text.Body style={{ fontWeight: 600 }}>
          {token?.symbol ?? "Select"}
        </Text.Body>
        <Text.Label>▼</Text.Label>
      </Row>
    </ClickableSurface>
  );
}
