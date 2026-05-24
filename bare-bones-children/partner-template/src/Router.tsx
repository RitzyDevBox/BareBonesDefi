import { createHashRouter, Navigate } from "react-router-dom";
import App from "./App";
import { BasicWalletPage } from "./pages/BasicWalletPage";
import { TestPage } from "./pages/TestPage";
import { LandingPage } from "./pages/LandingPage";
import { DappBrowserPage } from "./pages/DappBrowserPage";
import { DAOsPage } from "./pages/DAOsPage.tsx";
import { DAODetailPage } from "./pages/DAODetailPage.tsx";
import { OrganizationPage } from "./pages/OrganizationPage";
import { ROUTES } from "./routes";
import { OrganizationDetailPage } from "./pages/OrganizationDetailPage";
import { VaultPage } from "./pages/VaultPage";
import { VaultWalletPage } from "./pages/VaultWalletPage";
import { PaymentPage } from "./pages/PaymentPage";
import { CurrentPayrollPage } from "./pages/CurrentPayrollPage.tsx";
import { EntityFormationPage } from "./pages/EntityFormationPage";
import { FEATURE_FLAGS } from "./constants/featureFlags";

const devOnlyRoutes = import.meta.env.DEV
  ? [{ path: "test-page", element: <TestPage /> }]
  : [];

const organizationRoutes = FEATURE_FLAGS.organizations
  ? [
      { path: `${ROUTES.ORGANIZATIONS}`, element: <OrganizationPage /> },
      { path: `${ROUTES.ORGANIZATIONS}/:organizationId`, element: <OrganizationDetailPage /> },
    ]
  : [];

const entityFormationRoutes = FEATURE_FLAGS.entityFormation
  ? [{ path: `${ROUTES.ENTITIES_FORMATION}`, element: <EntityFormationPage /> }]
  : [];

const basicWalletRoutes = FEATURE_FLAGS.basicWallet
  ? [{ path: `${ROUTES.BASIC_WALLET}/:diamondAddress?`, element: <BasicWalletPage /> }]
  : [];

const dappBrowserRoutes = FEATURE_FLAGS.dappBrowser
  ? [{ path: `${ROUTES.DAPP_BROWSER}`, element: <DappBrowserPage /> }]
  : [];

const vaultsRoutes = FEATURE_FLAGS.vaults
  ? [
      { path: `${ROUTES.VAULTS}`, element: <VaultPage /> },
      { path: `${ROUTES.VAULT_DETAIL_ROUTE}`, element: <VaultWalletPage /> },
    ]
  : [];

export const router = createHashRouter([
  {
    path: ROUTES.ROOT,
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: `${ROUTES.DAOS}`, element: <DAOsPage /> },
      { path: `${ROUTES.DAOS_DETAIL_ROUTE}`, element: <DAODetailPage /> },
      { path: `${ROUTES.PAYMENTS}`, element: <PaymentPage /> },
      { path: `${ROUTES.PAYMENTS_ORG_ROUTE}`, element: <PaymentPage /> },
      { path: `${ROUTES.PAYROLL_DETAIL_ROUTE}`, element: <CurrentPayrollPage /> },
      ...basicWalletRoutes,
      ...dappBrowserRoutes,
      ...organizationRoutes,
      ...entityFormationRoutes,
      ...vaultsRoutes,
      ...devOnlyRoutes,

      { path: "*", element: <Navigate to={ROUTES.ROOT} replace /> },
    ],
  },
]);
