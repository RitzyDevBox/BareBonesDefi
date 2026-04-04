const BASIC_WALLET_SUB_ROUTE = 'basic-wallet-facet'
const ORGANIZATION_SUB_ROUTE = 'organizations'
const VAULTS_SUB_ROUTE = 'vaults'
const WALLETS_SUB_ROUTE = 'wallets'
const PAYMENTS_SUB_ROUTE = 'payments'
const PAYROLL_SUB_ROUTE = 'payroll'
const CURRENT_SUB_ROUTE = 'current'
const MANAGE_PAYEES_SUB_ROUTE = 'manage-payees'
const PAY_BATCHES_SUB_ROUTE = 'pay-batches'

export const ROUTES = {
  ROOT: "/",
  BASIC_WALLET: `/${BASIC_WALLET_SUB_ROUTE}`,
  DAPP_BROWSER: '/dapp-browser',
  PAYMENTS: `/${PAYMENTS_SUB_ROUTE}`,
  PAYMENTS_ORG_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId`,
  PAYMENTS_MANAGE_PAYEES_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId/${MANAGE_PAYEES_SUB_ROUTE}`,
  PAYMENTS_PAY_BATCHES_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId/${PAY_BATCHES_SUB_ROUTE}`,
  PAYROLL_CURRENT_ROUTE: `/${PAYMENTS_SUB_ROUTE}/:organizationId/${PAYROLL_SUB_ROUTE}/${CURRENT_SUB_ROUTE}`,
  ORGANIZATIONS: `/${ORGANIZATION_SUB_ROUTE}`,
  ORGANIZATION_DETAIL: (organizationId: string) => `/${ORGANIZATION_SUB_ROUTE}/${organizationId}`,
  VAULTS: `/${VAULTS_SUB_ROUTE}`,
  VAULT_DETAIL_ROUTE: `/${WALLETS_SUB_ROUTE}/:walletAddress/${VAULTS_SUB_ROUTE}/:vaultAddress`,

  // ✅ Navigation helper
  BASIC_WALLET_WITH_ADDRESS: (address: string) => `/${BASIC_WALLET_SUB_ROUTE}/${address}`,
  PAYMENTS_ORG: (organizationId: string) => `/${PAYMENTS_SUB_ROUTE}/${organizationId}`,
  PAYMENTS_MANAGE_PAYEES: (organizationId: string) =>
    `/${PAYMENTS_SUB_ROUTE}/${organizationId}/${MANAGE_PAYEES_SUB_ROUTE}`,
  PAYMENTS_PAY_BATCHES: (organizationId: string) =>
    `/${PAYMENTS_SUB_ROUTE}/${organizationId}/${PAY_BATCHES_SUB_ROUTE}`,
  PAYROLL_CURRENT: (organizationId: string) => `/${PAYMENTS_SUB_ROUTE}/${organizationId}/${PAYROLL_SUB_ROUTE}/${CURRENT_SUB_ROUTE}`,
  VAULT_DETAIL: (walletAddress: string, vaultAddress: string) =>`/${WALLETS_SUB_ROUTE}/${walletAddress}/${VAULTS_SUB_ROUTE}/${vaultAddress}`,
} as const;
