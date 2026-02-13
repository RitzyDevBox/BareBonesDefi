export interface TokenInfo {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export enum UserScope
{
  Account,
  SmartWallet
}

export interface TokenAmountDisplayFieldOptions {
  userAddress: string | null, 
  defaultTokenAddressResolver?: (chainId?: number | null) => string,
  preventTokenChange?: boolean
}

export interface TokenAmountInfo {
  token: TokenInfo | null;
  amount: string;
}
