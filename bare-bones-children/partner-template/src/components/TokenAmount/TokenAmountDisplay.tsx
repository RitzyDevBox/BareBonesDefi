import { Text } from "../BasicComponents";
import { IconButton } from "../IconButton";
import {
  AmountInput,
  Row,
  Stack,
  Surface,
  ClickableSurface,
} from "../Primitives";

import {
  TokenAmountDisplayFieldOptions,
  TokenInfo,
  UserScope,
} from "../TokenSelect/types";
import { useTokenBalance } from "../../hooks/useTokenBalance";
import { formatBalance } from "../../utils/formatUtils";
import { useShimWallet } from "../../hooks/useShimWallet";
import { NATIVE_TOKENS_BY_CHAIN, walletAddress } from "../../constants/misc";
import { useEffect } from "react";
import { useTokenList } from "../TokenSelect/useTokenList";

interface TokenAmountDisplayProps {
  token: TokenInfo | null;
  amount: string;
  onAmountChange: (amount: string) => void;
  onDefaultTokenSelect: (token: TokenInfo) => void;
  onTokenClick: () => void;
  options: TokenAmountDisplayFieldOptions;
}

export function TokenAmountDisplay({
  token,
  amount,
  onAmountChange,
  onDefaultTokenSelect,
  onTokenClick,
  options,
}: TokenAmountDisplayProps) {
  const { account, chainId } = useShimWallet();
  const { tokens, loading } = useTokenList(chainId);

  useEffect(() => {
    if (token) return;
    if (!options.defaultTokenAddressResolver) return;
    if (loading || !chainId) return;

    const defaultAddress = options.defaultTokenAddressResolver(chainId);
    if (!defaultAddress) return;

    const native = NATIVE_TOKENS_BY_CHAIN[chainId]

    const resolved = tokens.concat(native).find(
      (t) =>
        t.address.toLowerCase() ===
        defaultAddress.toLowerCase()
    );

    if (!resolved) return;

    onDefaultTokenSelect(resolved);
  }, [token, chainId, loading, tokens, options.defaultTokenAddressResolver, onDefaultTokenSelect, options]);

  const target = options.userScope === UserScope.Account ? account : walletAddress;
  const balance = useTokenBalance(target, token);
  const tokenChangeDisabled = options.preventTokenChange === true;

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
            onClick={!tokenChangeDisabled ? onTokenClick : undefined}
            style={{
              padding: "var(--spacing-xs)",
              borderRadius: "999px",
              cursor: tokenChangeDisabled ? "default" : "pointer",
              opacity: tokenChangeDisabled ? 0.7 : 1,
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

              {!tokenChangeDisabled && (
                <IconButton
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  style={{ pointerEvents: "none" }}
                >
                  ▾
                </IconButton>
              )}
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
