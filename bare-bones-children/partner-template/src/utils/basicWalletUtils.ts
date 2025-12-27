import { ethers } from "ethers";
import ERC20_ABI from "../abis/ERC20.json";
import { parseErc20, parseNative } from "../utils/transactionUtils";
import { AssetType } from "../components/UniversalWalletModal/models";

export interface RawTx {
  to: string;
  value: ethers.BigNumberish;
  data: string;
}

export interface SendNativeArgs {
    amount: string;
    recipient: string;
}

export interface SendERC20Args extends SendNativeArgs {
    tokenAddress?: string;
    decimals?: number | null;
}


export interface SendCurrencyArgs extends SendERC20Args {
  assetType: AssetType;
}

export function buildSendERC20RawTx(
  tokenAddress: string,
  to: string,
  amount: string,
  decimals?: number | null
): RawTx {
  const iface = new ethers.utils.Interface(ERC20_ABI);

  return {
    to: tokenAddress,
    value: 0,
    data: iface.encodeFunctionData("transfer", [
      to,
      parseErc20(amount, decimals),
    ]),
  };
}

export function buildSendNativeRawTx(
  to: string,
  amount: string
): RawTx {
  return {
    to,
    value: parseNative(amount),
    data: "0x",
  };
}

export function buildSendCurrencyRawTx(args: SendCurrencyArgs) {
  if (args.assetType === AssetType.NATIVE) {
    return buildSendNativeRawTx(args.recipient, args.amount);
  }

  return buildSendERC20RawTx(
    args.tokenAddress!,
    args.recipient,
    args.amount,
    args.decimals
  );
}

