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

export interface TokenPickerFieldOptions {
  userScope: UserScope
}

export interface TokenAmountInfo {
  token: TokenInfo | null;
  amount: string;
}
