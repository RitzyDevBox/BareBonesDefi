import type { ReactElement } from "react";
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
import { CapTablePage } from "./pages/CapTablePage";
import { LendingPage } from "./pages/LendingPage";
import { FEATURE_FLAGS } from "./constants/featureFlags";
import { useSettings, SettingsKey } from "./hooks/useSettings";

/** Runtime gate for user-toggleable features. The router is built once at
 *  module load, so a feature's routes are always registered; this redirects
 *  to home whenever the matching Settings flag is off — which also covers a
 *  user navigating to a hidden feature by direct URL. */
function FeatureRoute({ flag, children }: { flag: SettingsKey; children: ReactElement }) {
  const { settings } = useSettings();
  return settings[flag] ? children : <Navigate to={ROUTES.ROOT} replace />;
}

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

const dappBrowserRoutes = FEATURE_FLAGS.dappBrowser
  ? [{ path: `${ROUTES.DAPP_BROWSER}`, element: <DappBrowserPage /> }]
  : [];

// Wallet / Vaults / Payments are toggled at runtime from Settings, so their
// routes are always registered and gated by <FeatureRoute> rather than
// conditionally included at module load like the build-time features above.
export const router = createHashRouter([
  {
    path: ROUTES.ROOT,
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: `${ROUTES.DAOS}`, element: <DAOsPage /> },
      { path: `${ROUTES.DAOS_DETAIL_ROUTE}`, element: <DAODetailPage /> },
      {
        path: `${ROUTES.PAYMENTS}`,
        element: <FeatureRoute flag={SettingsKey.Payments}><PaymentPage /></FeatureRoute>,
      },
      {
        path: `${ROUTES.PAYMENTS_ORG_ROUTE}`,
        element: <FeatureRoute flag={SettingsKey.Payments}><PaymentPage /></FeatureRoute>,
      },
      {
        path: `${ROUTES.PAYROLL_DETAIL_ROUTE}`,
        element: <FeatureRoute flag={SettingsKey.Payments}><CurrentPayrollPage /></FeatureRoute>,
      },
      {
        path: `${ROUTES.BASIC_WALLET}/:diamondAddress?`,
        element: <FeatureRoute flag={SettingsKey.BasicWallet}><BasicWalletPage /></FeatureRoute>,
      },
      {
        path: `${ROUTES.VAULTS}`,
        element: <FeatureRoute flag={SettingsKey.Vaults}><VaultPage /></FeatureRoute>,
      },
      {
        path: `${ROUTES.VAULT_DETAIL_ROUTE}`,
        element: <FeatureRoute flag={SettingsKey.Vaults}><VaultWalletPage /></FeatureRoute>,
      },
      {
        path: `${ROUTES.CAP_TABLE}`,
        element: <FeatureRoute flag={SettingsKey.CapTable}><CapTablePage /></FeatureRoute>,
      },
      {
        path: `${ROUTES.CAP_TABLE_ORG_ROUTE}`,
        element: <FeatureRoute flag={SettingsKey.CapTable}><CapTablePage /></FeatureRoute>,
      },
      {
        path: `${ROUTES.LENDING}`,
        element: <FeatureRoute flag={SettingsKey.Lending}><LendingPage /></FeatureRoute>,
      },
      ...dappBrowserRoutes,
      ...organizationRoutes,
      ...entityFormationRoutes,
      ...devOnlyRoutes,

      { path: "*", element: <Navigate to={ROUTES.ROOT} replace /> },
    ],
  },
]);
