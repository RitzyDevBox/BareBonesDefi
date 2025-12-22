import { Box, Text } from "../BasicComponents";
import { IconButton } from "../IconButton";
import { TokenInfo } from "./types";

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
  return (
    <Box
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--spacing-md)",
        padding: "var(--spacing-md)",
        border: "1px solid var(--colors-border)",
        borderRadius: "var(--radius-md)",
        background: "var(--colors-background)",
      }}
    >
      {/* LEFT: token display */}
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-md)",
          minWidth: 0,
          flex: 1,
          background: "transparent",
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
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {token.name}
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

      {/* RIGHT: action */}
      <IconButton
        type="button"
        onClick={onChangeClick}
        aria-label={token ? "Change token" : "Select token"}
      >
        ▾
      </IconButton>

    </Box>
  );
}
