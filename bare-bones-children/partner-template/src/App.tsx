import { useShimWallet } from "./hooks/useShimWallet";
import { SwapForm } from "./components/SwapForm";
import "./styles/modal.css";

export default function App() {
  const { account, chainId, connect } = useShimWallet();

  function handleSignOrder(order: unknown) {
    console.log("Ready to sign order:", order);
  }

  return (
    <div>
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
