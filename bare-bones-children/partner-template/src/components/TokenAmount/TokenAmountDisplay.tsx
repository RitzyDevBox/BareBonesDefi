import { Text } from "../Primitives/Text";
import {
  AmountInput,
  Row,
  Stack,
  Surface,
} from "../Primitives";

import {
  TokenAmountDisplayFieldOptions,
  TokenInfo,
} from "../TokenSelect/types";
import { useTokenBalance } from "../../hooks/useTokenBalance";
import { formatBalance } from "../../utils/formatUtils";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { NATIVE_TOKENS_BY_CHAIN } from "../../constants/misc";
import { useEffect } from "react";
import { useTokenList } from "../TokenSelect/useTokenList";
import { TokenSelectButton } from "./TokenSelectButton";

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
  const { chainId } = useWalletProvider();
  const { tokens, loading } = useTokenList(chainId);

  useEffect(() => {
    if (token) return;
    if (!options.defaultTokenAddressResolver) return;
    if (loading || !chainId) return;

    const defaultAddress = options.defaultTokenAddressResolver(chainId);
    if (!defaultAddress) return;

    const native = NATIVE_TOKENS_BY_CHAIN[chainId];
    const resolved = tokens.concat(native).find(
      (t) => t.address.toLowerCase() === defaultAddress.toLowerCase()
    );

    if (!resolved) return;
    onDefaultTokenSelect(resolved);
  }, [
    token,
    chainId,
    loading,
    tokens,
    options.defaultTokenAddressResolver,
    onDefaultTokenSelect,
    options,
  ]);

  const balance = useTokenBalance(options.userAddress, token);
  const tokenChangeDisabled = options.preventTokenChange === true;

  return (
    <Surface style={{ padding: "var(--spacing-md) var(--spacing-sm) var(--spacing-sm)" }}>
      <Stack gap="xs">
        {/* TOP ROW */}
        <Row justify="between" align="center">
          <AmountInput
            value={amount}
            decimals={token?.decimals}
            onChange={onAmountChange}
            align="left"
          />

          <TokenSelectButton
            token={token}
            disabled={tokenChangeDisabled}
            onClick={onTokenClick}
          />
        </Row>

        <Row
          justify="between"
          align="center"
          style={{ fontSize: "0.75rem", lineHeight: 1.5, opacity: 0.85 }}
        >
          <Text.Body style={{ color: "var(--colors-text-muted)" }}>
            $0.00
          </Text.Body>

          <Text.Body
            style={{
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
