import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import { BasicWalletPage } from "./pages/BasicWalletPage";
import { TestPage } from "./pages/TestPage";

// Dev-only routes (not bundled in production)
const devOnlyRoutes = import.meta.env.DEV
  ? [{ path: "test-page", element: <TestPage /> }]
  : [];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // / → /basic-wallet-facet (always redirect here)
      { index: true, element: <Navigate to="/basic-wallet-facet" replace /> },

      // Main pages
      { path: "basic-wallet-facet/:diamondAddress?", element: <BasicWalletPage /> },

      // 👇 dev-only routes (NOT bundled in prod)
      ...devOnlyRoutes,

      // Catch-all fallback → /basic-wallet-facet
      { path: "*", element: <Navigate to="/basic-wallet-facet" replace /> },
    ],
  },
]);
