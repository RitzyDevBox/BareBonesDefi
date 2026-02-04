const BASIC_WALLET_SUB_ROUTE = 'basic-wallet-facet'
const ORGANIZATION_SUB_ROUTE = 'organizations'
const VAULTS_SUB_ROUTE = 'vaults'

export const ROUTES = {
  ROOT: "/",
  BASIC_WALLET: `/${BASIC_WALLET_SUB_ROUTE}`,
  DAPP_BROWSER: '/dapp-browser',
  ORGANIZATIONS: `/${ORGANIZATION_SUB_ROUTE}`,
  ORGANIZATION_DETAIL: (organizationId: string) => `/${ORGANIZATION_SUB_ROUTE}/${organizationId}`,
  VAULTS: `/${VAULTS_SUB_ROUTE}`,
  VAULTS_DETAIL_PAGE: (address: string) => `/${VAULTS_SUB_ROUTE}/${address}`,
  VAULT_DETAIL_ROUTE: `/${VAULTS_SUB_ROUTE}/:vaultAddress`,

  // ✅ Navigation helper
  BASIC_WALLET_WITH_ADDRESS: (address: string) => `/${BASIC_WALLET_SUB_ROUTE}/${address}`,
  VAULT_DETAIL: (address: string) =>`/${VAULTS_SUB_ROUTE}/${address}`,
} as const;
