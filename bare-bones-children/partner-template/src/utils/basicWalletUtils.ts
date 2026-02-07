import { BytesLike, ethers } from "ethers";
import { parseErc20, parseNative } from "../utils/transactionUtils";
import { AssetType } from "../components/UniversalWalletModal/models";
import WETH_ABI from "../abis/WETH.json";
import ERC20_ABI from "../abis/ERC20.json";
import ERC1155_ABI from "../abis/ERC1155.abi.json";
import ERC721_ABI from "../abis/IERC721.abi.json";
import { BigNumber } from "ethers";

export enum WrapMode {
  WRAP = "WRAP",
  UNWRAP = "UNWRAP",
}

export interface WrapArgs {
  amount: string;
  wethAddress: string;
}


export interface RawTx {
  to: string;
  value: ethers.BigNumberish | undefined;
  data: BytesLike;
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

const wethIface = new ethers.utils.Interface(WETH_ABI);
const erc20Iface = new ethers.utils.Interface(ERC20_ABI);
const erc721Iface = new ethers.utils.Interface(ERC721_ABI);
const erc1155Iface = new ethers.utils.Interface(ERC1155_ABI);


export function buildSendERC20RawTx(
  tokenAddress: string,
  to: string,
  amount: string,
  decimals?: number | null
): RawTx {

  return {
    to: tokenAddress,
    value: 0,
    data: erc20Iface.encodeFunctionData("transfer", [
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

export function buildWrapRawTx(
  args: WrapArgs,
  mode: WrapMode
) {
  const value = parseNative(args.amount);

  if (mode === WrapMode.WRAP) {
    // WETH.deposit() — value sent
    return {
      to: args.wethAddress,
      value,
      data: wethIface.encodeFunctionData("deposit", []),
    };
  }

  // WETH.withdraw(uint256)
  return {
    to: args.wethAddress,
    value: 0,
    data: wethIface.encodeFunctionData("withdraw", [value]),
  };
}

export function buildERC721DepositRawTx(token: string, from: string, vault: string, id: string): RawTx {
  return { 
    to: token, 
    value: 0, 
    data: erc721Iface.encodeFunctionData("safeTransferFrom", [from, vault, ethers.BigNumber.from(id)])
  };
}



export function buildERC1155DepositRawTx(token: string, from: string, vault: string, id: string, amount: string): RawTx {
  return {
    to: token,
    value: 0,
    data: erc1155Iface.encodeFunctionData("safeTransferFrom", [
      from,
      vault,
      BigNumber.from(id),
      BigNumber.from(amount),
      "0x",
    ]),
  };
}
