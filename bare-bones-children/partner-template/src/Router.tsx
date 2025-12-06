import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import { SwapPage } from "./pages/SwapPage";
import { DeployDiamondPage } from "./pages/DeployWalletPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // / → /swap
      { index: true, element: <Navigate to="/deploy-wallet" replace /> },

      // Default route
      { path: "swap", element: <SwapPage /> },

      // Other pages
      { path: "deploy-wallet", element: <DeployDiamondPage /> },

      // Catch-all fallback → /deploy-wallet
      { path: "*", element: <Navigate to="/deploy-wallet" replace /> },
    ],
  },
]);
