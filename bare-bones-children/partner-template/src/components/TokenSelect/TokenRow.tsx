import { Box } from "../BasicComponents";
import { Text } from "../Primitives/Text"
import { IconButton } from "../Button/IconButton";
import { TokenInfo } from "./types";

export function TokenRow({
  token,
  isCustom,
  onRemoveCustom,
  onSelect,
}: {
  token: TokenInfo;
  isCustom: boolean;
  onRemoveCustom?: () => void;
  onSelect: (t: TokenInfo) => void;
}) {
  async function addToWallet() {
    if (!window.ethereum?.request) return;

    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          image: token.logoURI,
        },
      },
    });
  }

  return (
    <Box
      onClick={() => onSelect(token)}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "var(--spacing-md)",
        borderBottom: "1px solid var(--colors-border)",
        cursor: "pointer",
        background: "transparent",

        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: "var(--spacing-md)",
      }}
    >
      {/* LEFT: logo + text */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "32px minmax(0, 1fr)",
          alignItems: "center",
          gap: "var(--spacing-md)",
          minWidth: 0,
          background: "transparent",
        }}
      >
        {/* Logo */}
        <Box
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--colors-border)",
            overflow: "hidden",
          }}
        >
          {token.logoURI && (
            <img
              src={token.logoURI}
              alt=""
              style={{ width: "100%", height: "100%" }}
            />
          )}
        </Box>

        {/* Symbol + name */}
        <Box style={{ minWidth: 0, background: "transparent" }}>
          <a
            href={`https://hyperevmscan.io/token/${token.address}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "inline-block",
              fontWeight: 600,
              color: "var(--colors-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textDecoration: "none",
            }}
          >
            {token.symbol}
          </a>

          <Text.Body
            style={{
              color: "var(--colors-text-muted)",
              fontSize: "0.9em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              margin: 0,
            }}
          >
            {token.name}
          </Text.Body>
        </Box>
      </Box>

      {/* RIGHT: add button */}
      <Box
        onClick={(e) => e.stopPropagation()}
        style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-xs)",
            background: "transparent",
        }}
      >
        {isCustom && (
            <IconButton
            onClick={onRemoveCustom}
            style={{
                color: "var(--colors-error)",
                borderColor: "var(--colors-error)",
            }}
            >
            −
            </IconButton>
        )}

        <IconButton onClick={addToWallet}>+</IconButton>
      </Box>
    </Box>
  );
}
