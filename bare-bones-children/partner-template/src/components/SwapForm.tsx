import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TokenPicker, TokenInfo } from "./TokenPicker";
import { useShimWallet } from "../hooks/useShimWallet";

interface Props {
  chainId: number | null;
  onSign: (order: unknown) => void;
}

export function SwapForm({ chainId, onSign }: Props) {
  const { provider, account } = useShimWallet();
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(null);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);
  const [amountIn, setAmountIn] = useState("");
  const [balance, setBalance] = useState<string>("-");

  // fetch balance whenever account or token changes
  useEffect(() => {
    async function fetchBalance() {
      if (!provider || !account || !tokenIn) return;
      try {
        if ("type" in tokenIn && tokenIn.type === "native") {
          const bal = await provider.getBalance(account);
          setBalance(ethers.utils.formatUnits(bal, 18));
        } else {
          const erc20 = new ethers.Contract(
            tokenIn.address,
            ["function balanceOf(address owner) view returns (uint256)"],
            provider
          );
          const bal = await erc20.balanceOf(account);
          setBalance(ethers.utils.formatUnits(bal, tokenIn.decimals));
        }
      } catch {
        setBalance("-");
      }
    }
    fetchBalance();
  }, [provider, account, tokenIn]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenIn || !tokenOut || !amountIn) return;

    const order = {
      type: "LIMIT_ORDER",
      tokenIn,
      tokenOut,
      amountIn,
      amountOut: "TBD",
      expiry: Date.now() + 1000 * 60 * 15,
    };
    onSign(order);
  }

  return (
    <div className="modal">
      <h3>Swap</h3>

      <form onSubmit={handleSubmit}>
        <label>From Token</label>
        <TokenPicker chainId={chainId} label="From" onSelect={(t) => setTokenIn(t as TokenInfo)} />

        <label>To Token</label>
        <TokenPicker chainId={chainId} label="To" onSelect={(t) => setTokenOut(t as TokenInfo)} />

        <label>Amount In</label>
        <input
          type="number"
          step="any"
          placeholder="0.0"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
        />

        <div>
          <small>Balance: {balance}</small>
        </div>

        <button type="submit" disabled={!account}>
          Sign Order
        </button>
      </form>
    </div>
  );
}
