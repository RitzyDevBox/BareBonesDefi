const BASIC_WALLET_SUB_ROUTE = 'basic-wallet-facet'
const ORGANIZATION_SUB_ROUTE = 'organizations'
const VAULTS_SUB_ROUTE = 'vaults'
const DAOS_SUB_ROUTE = 'daos'
const WALLETS_SUB_ROUTE = 'wallets'
const PAYMENTS_SUB_ROUTE = 'payments'
const PAYROLL_SUB_ROUTE = 'payroll'
const PAYROLLS_SUB_ROUTE = 'payrolls'
const PAY_BATCHES_SUB_ROUTE = 'pay-batches'
const EARNINGS_SUB_ROUTE = 'earnings'

export const ROUTES = {
  ROOT: "/",
  BASIC_WALLET: `/${BASIC_WALLET_SUB_ROUTE}`,
  DAPP_BROWSER: '/dapp-browser',
  DAOS: `/${DAOS_SUB_ROUTE}`,
  DAOS_DETAIL_ROUTE: `/${DAOS_SUB_ROUTE}/:daoAddress`,
  PAYMENTS: `/${PAYMENTS_SUB_ROUTE}`,
  PAYMENTS_ORG_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId`,
  PAYMENTS_PAY_BATCHES_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId/${PAY_BATCHES_SUB_ROUTE}`,
  PAYMENTS_EARNINGS_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId/${EARNINGS_SUB_ROUTE}`,
  PAYROLLS_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId/${PAYROLLS_SUB_ROUTE}`,
  PAYROLL_DETAIL_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId/${PAYROLL_SUB_ROUTE}/:payrollId`,
  ORGANIZATIONS: `/${ORGANIZATION_SUB_ROUTE}`,
  ORGANIZATION_DETAIL: (organizationId: string) => `/${ORGANIZATION_SUB_ROUTE}/${organizationId}`,
  VAULTS: `/${VAULTS_SUB_ROUTE}`,
  VAULT_DETAIL_ROUTE: `/${WALLETS_SUB_ROUTE}/:walletAddress/${VAULTS_SUB_ROUTE}/:vaultAddress`,

  // ✅ Navigation helper
  BASIC_WALLET_WITH_ADDRESS: (address: string) => `/${BASIC_WALLET_SUB_ROUTE}/${address}`,
  PAYMENTS_ORG: (organizationId: string) => `/${PAYMENTS_SUB_ROUTE}/${organizationId}`,
  PAYMENTS_PAY_BATCHES: (organizationId: string) =>
    `/${PAYMENTS_SUB_ROUTE}/${organizationId}/${PAY_BATCHES_SUB_ROUTE}`,
  PAYMENTS_EARNINGS: (organizationId: string) =>
    `/${PAYMENTS_SUB_ROUTE}/${organizationId}/${EARNINGS_SUB_ROUTE}`,
  PAYROLLS: (organizationId: string) =>
    `/${PAYMENTS_SUB_ROUTE}/${organizationId}/${PAYROLLS_SUB_ROUTE}`,
  PAYROLL_DETAIL: (organizationId: string, payrollId: string | number) =>
    `/${PAYMENTS_SUB_ROUTE}/${organizationId}/${PAYROLL_SUB_ROUTE}/${String(payrollId)}`,
  DAO_DETAIL: (daoAddress: string) => `/${DAOS_SUB_ROUTE}/${daoAddress}`,
  VAULT_DETAIL: (walletAddress: string, vaultAddress: string) =>`/${WALLETS_SUB_ROUTE}/${walletAddress}/${VAULTS_SUB_ROUTE}/${vaultAddress}`,
} as const;
