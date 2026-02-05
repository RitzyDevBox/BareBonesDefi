const BASIC_WALLET_SUB_ROUTE = 'basic-wallet-facet'
const ORGANIZATION_SUB_ROUTE = 'organizations'
const VAULTS_SUB_ROUTE = 'vaults'
const WALLETS_SUB_ROUTE = 'wallets'

export const ROUTES = {
  ROOT: "/",
  BASIC_WALLET: `/${BASIC_WALLET_SUB_ROUTE}`,
  DAPP_BROWSER: '/dapp-browser',
  ORGANIZATIONS: `/${ORGANIZATION_SUB_ROUTE}`,
  ORGANIZATION_DETAIL: (organizationId: string) => `/${ORGANIZATION_SUB_ROUTE}/${organizationId}`,
  VAULTS: `/${VAULTS_SUB_ROUTE}`,
  VAULT_DETAIL_ROUTE: `/${WALLETS_SUB_ROUTE}/:walletAddress/${VAULTS_SUB_ROUTE}/:vaultAddress`,

  // ✅ Navigation helper
  BASIC_WALLET_WITH_ADDRESS: (address: string) => `/${BASIC_WALLET_SUB_ROUTE}/${address}`,
  VAULT_DETAIL: (walletAddress: string, vaultAddress: string) =>`/${WALLETS_SUB_ROUTE}/${walletAddress}/${VAULTS_SUB_ROUTE}/${vaultAddress}`,
} as const;
