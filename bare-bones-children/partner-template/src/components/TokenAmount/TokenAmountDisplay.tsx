
import { Text } from "../BasicComponents";
import { IconButton } from "../IconButton";
import { useShimWallet } from "../../hooks/useShimWallet";
import { useTokenBalance } from "../../hooks/useTokenBalance";
import { formatBalance } from "../../utils/formatUtils";
import { walletAddress } from "../../constants/misc";
import { TokenInfo, UserScope } from "../TokenSelect/types";
import { ClickableSurface, Row, Stack, Surface } from "../Primitives";

export interface TokenAmountDisplayProps {
  token: TokenInfo | null;
  amount: string;
  onAmountChange: (value: string) => void;
  onTokenClick: () => void;
  userScope: UserScope;
}

export function TokenAmountDisplay({
  token,
  amount,
  onAmountChange,
  onTokenClick,
  userScope,
}: TokenAmountDisplayProps) {
  const { account } = useShimWallet();
  const targetUser =
    userScope === UserScope.Account ? account : walletAddress;

  const balance = useTokenBalance(targetUser, token);

  return (
    <Surface>
      <Stack gap="sm">
        {/* Header */}
        <Row justify="between">
          <Text.Label>Amount</Text.Label>
          <Text.Body
            style={{
              fontSize: "0.85em",
              color: "var(--colors-text-muted)",
            }}
          >
            {balance !== null
              ? `Balance: ${formatBalance(balance)}`
              : "Balance: —"}
          </Text.Body>
        </Row>

        {/* Main row */}
        <Row align="center" gap="sm">
          {/* Amount input */}
          <input
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0"
            inputMode="decimal"
            style={{
              flex: 1,
              fontSize: 28,
              fontWeight: 600,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--colors-text-main)",
              minWidth: 0,
            }}
          />

          {/* Token pill */}
          <ClickableSurface
            onClick={onTokenClick}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
            }}
          >
            <Row gap="xs" align="center">
              {token?.logoURI ? (
                <img
                  src={token.logoURI}
                  alt={token.symbol}
                  width={28}
                  height={28}
                  style={{ borderRadius: "50%" }}
                />
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--colors-border)",
                  }}
                />
              )}

              <Text.Body style={{ fontWeight: 600 }}>
                {token?.symbol ?? "Select"}
              </Text.Body>

              <IconButton tabIndex={-1} aria-hidden>
                ▾
              </IconButton>
            </Row>
          </ClickableSurface>
        </Row>
      </Stack>
    </Surface>
  );
}
