import { Text } from "../BasicComponents";
import { IconButton } from "../IconButton";
import {
  AmountInput,
  Row,
  Stack,
  Surface,
  ClickableSurface,
} from "../Primitives";

import { TokenInfo, UserScope } from "../TokenSelect/types";
import { useTokenBalance } from "../../hooks/useTokenBalance";
import { formatBalance } from "../../utils/formatUtils";
import { useShimWallet } from "../../hooks/useShimWallet";
import { walletAddress } from "../../constants/misc";

interface TokenAmountDisplayProps {
  token: TokenInfo | null;
  amount: string;
  onAmountChange: (amount: string) => void;
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

  const target =
    userScope === UserScope.Account ? account : walletAddress;

  const balance = useTokenBalance(target, token);

  return (
    <Surface>
      <Stack gap="xs">
        {/* TOP ROW */}
        <Row justify="between" align="center">
          {/* AMOUNT — LEFT */}
          <AmountInput
            value={amount}
            decimals={token?.decimals}
            onChange={onAmountChange}
            align="left"
          />

          {/* TOKEN SELECTOR — RIGHT */}
          <ClickableSurface
            onClick={onTokenClick}
            style={{
              padding: "var(--spacing-xs)",
              borderRadius: "999px",
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

              <IconButton
                type="button"
                aria-hidden
                tabIndex={-1}
                style={{ pointerEvents: "none" }}
              >
                ▾
              </IconButton>
            </Row>
          </ClickableSurface>
        </Row>

        {/* BOTTOM ROW */}
        <Row justify="between" align="center">
          {/* FIAT PLACEHOLDER — LEFT */}
          <Text.Body
            style={{
              fontSize: "0.75em",
              color: "var(--colors-text-muted)",
            }}
          >
            $0.00
          </Text.Body>

          {/* BALANCE — RIGHT */}
          <Text.Body
            style={{
              fontSize: "0.75em",
              color: "var(--colors-text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {balance !== null
              ? `Balance: ${formatBalance(balance)}`
              : "Balance: —"}
          </Text.Body>
        </Row>
      </Stack>
    </Surface>
  );
}
