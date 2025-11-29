import { SwapForm } from "../components/SwapForm";
import { handleSignOrder } from "../utils/handleSignOrder";
import { useShimWallet } from "../hooks/useShimWallet";

export function SwapPage() {
  const { account, chainId, provider } = useShimWallet();

  if (!provider || !account || !chainId) {
    return null;
  }

  return (
    <div className="modal-container">
      <SwapForm
        chainId={chainId}
        onSign={(tokenIn, tokenOut, meta, quote) =>
          handleSignOrder(provider, account, chainId, tokenIn, tokenOut, meta, quote)
        }
      />
    </div>
  );
}
