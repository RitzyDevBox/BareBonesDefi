import { useShimWallet } from "./hooks/useShimWallet";
import { OrderMetadata, SwapForm } from "./components/SwapForm";
import { buildDutchOrder } from "./utils/buildDutchOrder";
import "./styles/modal.css";

import { PERMIT2_MAPPING, REACTOR_ADDRESS_MAPPING } from "@uniswap/uniswapx-sdk";
import { broadcastOrder } from "./utils/broadcastOrder";

export default function App() {
  const { account, chainId, connect, provider } = useShimWallet();

  async function handleSignOrder(orderMeta: OrderMetadata) {
    if (!provider || !account || !chainId) return;

    const signer = provider.getSigner();
    const { Dutch_V2: dutchReactorV2Address } = REACTOR_ADDRESS_MAPPING[chainId];
    const permit2Address = PERMIT2_MAPPING[chainId];

    if (!dutchReactorV2Address || !permit2Address) return;

    const order = await buildDutchOrder({
      chainId,
      reactor: dutchReactorV2Address,
      permit2: permit2Address,
      swapper: account,
      tokenIn: orderMeta.tokenIn.address,
      tokenOut: orderMeta.tokenOut.address,
      tokenInAmount: orderMeta.amountIn,
      tokenOutMinAmount: orderMeta.minAmountOut,
    });

    const { domain, types, values } = order.permitData();
    const signature = await signer._signTypedData(domain, types, values);
    broadcastOrder(order, signature, chainId)
  }

  // ✅ App returns JSX here
  return (
    <div>
      {!account ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <p>
          Connected: <strong>{account}</strong> (Chain {chainId})
        </p>
      )}
      <SwapForm chainId={chainId} onSign={handleSignOrder} />
    </div>
  );
}
