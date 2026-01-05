import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import { BasicWalletPage } from "./pages/BasicWalletPage";
import { TestPage } from "./pages/TestPage";
import { LandingPage } from "./pages/LandingPage";
import { DappBrowserPage } from "./pages/DappBrowserPage";
import { ROUTES } from "./routes";

const devOnlyRoutes = import.meta.env.DEV
  ? [{ path: "test-page", element: <TestPage /> }]
  : [];

export const router = createBrowserRouter([
  {
    path: ROUTES.ROOT,
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },

      {
        path: `${ROUTES.BASIC_WALLET}/:diamondAddress?`,
        element: <BasicWalletPage />,
      },
      {path: `${ROUTES.DAPP_BROWSER}`, element: <DappBrowserPage/> },

      ...devOnlyRoutes,

      { path: "*", element: <Navigate to={ROUTES.ROOT} replace /> },
    ],
  },
]);
