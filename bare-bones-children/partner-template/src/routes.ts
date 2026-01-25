const BASIC_WALLET_SUB_ROUTE = 'basic-wallet-facet'
const ORGANIZATION_SUB_ROUTE = 'organizations'

export const ROUTES = {
  ROOT: "/",
  BASIC_WALLET: `/${BASIC_WALLET_SUB_ROUTE}`,
  BASIC_WALLET_WITH_ADDRESS: (address: string) => `/${BASIC_WALLET_SUB_ROUTE}/${address}`,
  DAPP_BROWSER: '/dapp-browser',
  ORGANIZATIONS: `/${ORGANIZATION_SUB_ROUTE}`,
  ORGANIZATION_DETAIL: (organizationId: string) => `/${ORGANIZATION_SUB_ROUTE}/${organizationId}`
} as const;
