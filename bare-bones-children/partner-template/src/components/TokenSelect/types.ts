export interface TokenInfo {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export type TokenAmountInfo = TokenInfo & {
  amount: string;
};

export enum UserScope
{
  Account,
  SmartWallet
}

export interface TokenPickerFieldOptions {
  userScope: UserScope
}