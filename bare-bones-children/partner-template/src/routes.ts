const BASIC_WALLET_SUB_ROUTE = 'basic-wallet-facet'
const ORGANIZATION_SUB_ROUTE = 'organizations'
const VAULTS_SUB_ROUTE = 'vaults'
const DAOS_SUB_ROUTE = 'daos'
const WALLETS_SUB_ROUTE = 'wallets'
const PAYMENTS_SUB_ROUTE = 'payments'
const PAYROLL_SUB_ROUTE = 'payroll'

export const ROUTES = {
  ROOT: "/",
  BASIC_WALLET: `/${BASIC_WALLET_SUB_ROUTE}`,
  DAPP_BROWSER: '/dapp-browser',
  DAOS: `/${DAOS_SUB_ROUTE}`,
  DAOS_DETAIL_ROUTE: `/${DAOS_SUB_ROUTE}/:daoAddress`,
  PAYMENTS: `/${PAYMENTS_SUB_ROUTE}`,
  PAYMENTS_ORG_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId`,
  PAYROLL_DETAIL_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId/${PAYROLL_SUB_ROUTE}/:payrollId`,
  ORGANIZATIONS: `/${ORGANIZATION_SUB_ROUTE}`,
  VAULTS: `/${VAULTS_SUB_ROUTE}`,
  VAULT_DETAIL_ROUTE: `/${WALLETS_SUB_ROUTE}/:walletAddress/${VAULTS_SUB_ROUTE}/:vaultAddress`,

  // Navigation helpers
  BASIC_WALLET_WITH_ADDRESS: (address: string) => `/${BASIC_WALLET_SUB_ROUTE}/${address}`,
  PAYMENTS_ORG: (organizationId: string) => `/${PAYMENTS_SUB_ROUTE}/${organizationId}`,
  PAYMENTS_ORG_TAB: (organizationId: string, tab: string) =>
    `/${PAYMENTS_SUB_ROUTE}/${organizationId}?tab=${tab}`,
  PAYROLL_DETAIL: (organizationId: string, payrollId: string | number) =>
    `/${PAYMENTS_SUB_ROUTE}/${organizationId}/${PAYROLL_SUB_ROUTE}/${String(payrollId)}`,
  ORGANIZATION_DETAIL: (organizationId: string) => `/${ORGANIZATION_SUB_ROUTE}/${organizationId}`,
  DAO_DETAIL: (daoAddress: string) => `/${DAOS_SUB_ROUTE}/${daoAddress}`,
  VAULT_DETAIL: (walletAddress: string, vaultAddress: string) =>
    `/${WALLETS_SUB_ROUTE}/${walletAddress}/${VAULTS_SUB_ROUTE}/${vaultAddress}`,
} as const;
