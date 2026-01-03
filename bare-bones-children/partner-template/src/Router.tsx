import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import { DeployDiamondPage } from "./pages/DeployWalletPage";
import { BasicWalletPage } from "./pages/BasicWalletPage";
import { TestPage } from "./pages/TestPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // / → /swap
      { index: true, element: <Navigate to="/deploy-wallet" replace /> },

      // Other pages
      { path: "deploy-wallet", element: <DeployDiamondPage /> },
      { path: "basic-wallet-facet/:diamondAddress?", element: <BasicWalletPage /> },
      { path: "test-page", element: <TestPage />},
      // Catch-all fallback → /deploy-wallet
      { path: "*", element: <Navigate to="/deploy-wallet" replace /> },
    ],
  },
]);
