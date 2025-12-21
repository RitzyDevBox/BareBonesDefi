import { Box } from "../BasicComponents";

interface Token {
  symbol: string;
  name: string;
  balance: string;
}

export function TokenRow({ token }: { token: Token }) {
  return (
    <Box
      style={{
        padding: "var(--spacing-md)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      <div>
        <strong>{token.symbol}</strong>
        <div style={{ color: "var(--colors-text-muted)" }}>
          {token.name}
        </div>
      </div>
      <div>{token.balance}</div>
    </Box>
  );
}
