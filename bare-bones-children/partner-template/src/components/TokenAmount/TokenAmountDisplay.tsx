import { Text } from "../Primitives/Text"
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
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { NATIVE_TOKENS_BY_CHAIN, walletAddress } from "../../constants/misc";
import { useEffect } from "react";
import { useTokenList } from "../TokenSelect/useTokenList";
import { TokenAvatar } from "./TokenAvatar";

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
  const { account, chainId } = useWalletProvider();
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
    <Surface style={{ padding: "var(--spacing-md) var(--spacing-sm) 0px var(--spacing-sm)" }}>
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

          <ClickableSurface as="button" type="button"
            onClick={!tokenChangeDisabled ? onTokenClick : undefined}
            style={{
              padding: "var(--spacing-xs)",
              borderRadius: "999px",
              cursor: tokenChangeDisabled ? "default" : "pointer",
              opacity: tokenChangeDisabled ? 0.7 : 1,
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
        </Row>

        <Row justify="between" align="center" style={{ fontSize: "0.75rem", lineHeight: 1.2, opacity: 0.85 }}>
          <Text.Body
            style={{
              fontSize: "0.75em",
              color: "var(--colors-text-muted)",
            }}
          >
            $0.00
          </Text.Body>

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
