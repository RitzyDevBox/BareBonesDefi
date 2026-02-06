import { ethers } from "ethers";
import SecureValueReserveAbi from "../../abis/diamond/infrastructure/SecureValueReserve.abi.json";
import { RawTx } from "../basicWalletUtils";
import { AssetType } from "../../models/vaults/vaultTypes";

const iface = new ethers.utils.Interface(SecureValueReserveAbi);

export interface VaultSendArgs {
  assetType: AssetType;
  asset: string;
  id: string;
  amount: string;
}

export interface VaultReleaseArgs extends VaultSendArgs {
  to: string;
}

export interface VaultWithdrawArgs extends VaultSendArgs {}

export function buildVaultReleaseRawTx(vaultAddress: string, args: VaultReleaseArgs): RawTx {
  return {
    to: vaultAddress,
    value: args.assetType === AssetType.Native ? ethers.BigNumber.from(args.amount) : 0,
    data: iface.encodeFunctionData("release", [
      args.assetType,
      args.asset,
      args.id,
      args.amount,
      args.to,
    ]),
  };
}

export function buildVaultWithdrawRawTx(vaultAddress: string, args: VaultWithdrawArgs): RawTx {
  return {
    to: vaultAddress,
    value: 0,
    data: iface.encodeFunctionData("withdraw", [
      args.assetType,
      args.asset,
      args.id,
      args.amount,
    ]),
  };
}
