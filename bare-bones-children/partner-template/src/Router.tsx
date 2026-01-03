import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import { DeployDiamondPage } from "./pages/DeployWalletPage";
import { BasicWalletPage } from "./pages/BasicWalletPage";
import { TestPage } from "./pages/TestPage";

const devOnlyRoutes = import.meta.env.DEV
  ? [{ path: "test-page", element: <TestPage /> }]
  : [];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // / → /deploy-wallet
      { index: true, element: <Navigate to="/deploy-wallet" replace /> },

      // Main pages
      { path: "deploy-wallet", element: <DeployDiamondPage /> },
      { path: "basic-wallet-facet/:diamondAddress?", element: <BasicWalletPage /> },

      // 👇 dev-only routes (NOT bundled in prod)
      ...devOnlyRoutes,

      // Catch-all fallback
      { path: "*", element: <Navigate to="/deploy-wallet" replace /> },
    ],
  },
]);
