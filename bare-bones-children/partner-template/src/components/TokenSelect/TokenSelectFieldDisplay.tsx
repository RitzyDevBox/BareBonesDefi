import { Box, Text } from "../BasicComponents";
import { IconButton } from "../IconButton";
import { TokenInfo } from "./types";
import { useTokenBalance } from "../../hooks/useTokenBalance";
import { formatBalance } from "../../utils/formatUtils";

interface TokenPickerFieldProps {
  token?: TokenInfo | null;
  placeholder?: string;
  onChangeClick: () => void;
}

export function TokenSelectFieldDisplay({
  token,
  placeholder = "Select token",
  onChangeClick,
}: TokenPickerFieldProps) {
  const balance = useTokenBalance(token);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onChangeClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChangeClick();
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--spacing-md)",
        padding: "var(--spacing-md)",
        border: "1px solid var(--colors-border)",
        borderRadius: "var(--radius-md)",
        background: "var(--colors-background)",
        cursor: "pointer",
      }}
    >
      {/* LEFT */}
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-md)",
          minWidth: 0,
          flex: 1,
          pointerEvents: "none",
        }}
      >
        {token?.logoURI ? (
          <img
            src={token.logoURI}
            alt={token.symbol}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
        ) : (
          <Box
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--colors-border)",
              flexShrink: 0,
            }}
          />
        )}

        <Box style={{ minWidth: 0 }}>
          {token ? (
            <>
              <Text.Body
                style={{
                  margin: 0,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {token.symbol}
              </Text.Body>

              <Text.Body
                style={{
                  margin: 0,
                  fontSize: "0.85em",
                  color: "var(--colors-text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {balance !== null
                  ? `Balance: ${formatBalance(balance)}`
                  : "Balance: —"}
              </Text.Body>
            </>
          ) : (
            <Text.Body
              style={{
                margin: 0,
                color: "var(--colors-text-muted)",
              }}
            >
              {placeholder}
            </Text.Body>
          )}
        </Box>
      </Box>

      {/* RIGHT (visual only) */}
      <IconButton
        type="button"
        aria-hidden
        tabIndex={-1}
        style={{ pointerEvents: "none" }}
      >
        ▾
      </IconButton>
    </Box>
  );
}
