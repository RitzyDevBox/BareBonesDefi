import { useShimWallet } from "./hooks/useShimWallet";
import { SwapForm } from "./components/SwapForm";

export default function App() {
  const { account, chainId, connect } = useShimWallet();

  function handleSignOrder(order: unknown) {
    console.log("Ready to sign order:", order);
    // TODO: integrate with signer._signTypedData for real UniswapX flow
  }

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Swap DApp</h1>

      {!account ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <p>
          Connected: <strong>{account}</strong> (Chain {chainId})
        </p>
      )}

      <SwapForm chainId={chainId ? parseInt(chainId) : null} onSign={handleSignOrder} />
    </div>
  );
}
