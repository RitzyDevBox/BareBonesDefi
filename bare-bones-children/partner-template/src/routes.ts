export const ROUTES = {
  ROOT: "/",
  BASIC_WALLET: "/basic-wallet-facet",
  BASIC_WALLET_WITH_ADDRESS: (address: string) =>
    `/basic-wallet-facet/${address}`,
  DAPP_BROWSER: '/dapp-browser'
} as const;
