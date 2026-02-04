import { createHashRouter, Navigate } from "react-router-dom";
import App from "./App";
import { BasicWalletPage } from "./pages/BasicWalletPage";
import { TestPage } from "./pages/TestPage";
import { LandingPage } from "./pages/LandingPage";
import { DappBrowserPage } from "./pages/DappBrowserPage";
import { OrganizationPage } from "./pages/OrganizationPage";
import { ROUTES } from "./routes";
import { OrganizationDetailPage } from "./pages/OrganizationDetailPage";
import { VaultPage } from "./pages/VaultPage";
import { VaultWalletPage } from "./pages/VaultWalletPage";

const devOnlyRoutes = import.meta.env.DEV
  ? [{ path: "test-page", element: <TestPage /> }]
  : [];

export const router = createHashRouter([
  {
    path: ROUTES.ROOT,
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: `${ROUTES.BASIC_WALLET}/:diamondAddress?`, element: <BasicWalletPage />},
      { path: `${ROUTES.DAPP_BROWSER}`, element: <DappBrowserPage/> },
      { path: `${ROUTES.ORGANIZATIONS}`, element: <OrganizationPage/> },
      { path: `${ROUTES.ORGANIZATIONS}/:organizationId`, element: <OrganizationDetailPage /> },
      { path: `${ROUTES.VAULTS}`, element: <VaultPage/>},
      { path: `${ROUTES.VAULT_DETAIL_ROUTE}`, element: <VaultWalletPage/>},
      ...devOnlyRoutes,

      { path: "*", element: <Navigate to={ROUTES.ROOT} replace /> },
    ],
  },
]);
