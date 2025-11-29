import { useShimWallet } from "./hooks/useShimWallet";
import { Outlet } from "react-router-dom";
import "./styles/modal.css";

export default function App() {
  const { account, chainId, connect } = useShimWallet();

  return (
    <div>
      {!account ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <p>
          Connected: <strong>{account}</strong> (Chain {chainId})
        </p>
      )}

      <Outlet />
    </div>
  );
}
