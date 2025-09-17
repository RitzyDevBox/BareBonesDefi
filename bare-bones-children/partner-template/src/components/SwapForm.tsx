import { useState } from "react";
import { TokenPicker, TokenInfo } from "./TokenPicker";

interface Props {
  chainId: number | null;
  onSign: (order: unknown) => void;
}

export function SwapForm({ chainId, onSign }: Props) {
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(null);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);
  const [amountIn, setAmountIn] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenIn || !tokenOut || !amountIn) return;

    // simple UniswapX-style order payload
    const order = {
      type: "LIMIT_ORDER",
      tokenIn,
      tokenOut,
      amountIn,
      amountOut: "TBD", // left blank for now
      expiry: Date.now() + 1000 * 60 * 15, // 15 mins
    };
    onSign(order);
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px" }}>
      <TokenPicker chainId={chainId} label="From" onSelect={(t) => setTokenIn(t as TokenInfo)} />
      <TokenPicker chainId={chainId} label="To" onSelect={(t) => setTokenOut(t as TokenInfo)} />

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Amount In:
          <input
            type="text"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          />
        </label>
      </div>

      <button type="submit">Sign Order</button>
    </form>
  );
}
