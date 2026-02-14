import { ethers } from "ethers";
import SecureValueReserveAbi from "../../abis/diamond/infrastructure/SecureValueReserve.abi.json";
import { RawTx } from "../basicWalletUtils";
import { AssetType } from "../../models/vaults/vaultTypes";
import { parseErc20 } from "../transactionUtils";
import { ZERO_ADDRESS } from "../../constants/misc";

const iface = new ethers.utils.Interface(SecureValueReserveAbi);

export interface VaultSendArgs {
  assetType: AssetType;
  asset: string;
  id: string;
  amount: string;
  decimals?: number | null;
}

export interface VaultReleaseArgs extends VaultSendArgs {
  to: string;
}

export interface VaultWithdrawArgs extends VaultSendArgs {}

function normalizeVaultAmount(args: VaultSendArgs): ethers.BigNumber {
  if (args.assetType === AssetType.ERC721) return ethers.constants.One;
  if (args.assetType === AssetType.ERC1155) return ethers.BigNumber.from(args.amount);
  const decimals = args.decimals ?? 18;
  return parseErc20(args.amount, decimals);
}

export function buildVaultReleaseRawTx(vaultAddress: string, args: VaultReleaseArgs): RawTx {
  const normalizedAmount = normalizeVaultAmount(args);
  const asset = args.assetType === AssetType.Native ? ZERO_ADDRESS : args.asset;

  return {
    to: vaultAddress,
    value: ethers.constants.Zero,
    data: iface.encodeFunctionData("release", [
      args.assetType,
      asset,
      ethers.BigNumber.from(args.id),
      normalizedAmount,
      args.to,
    ]),
  };
}

export function buildVaultWithdrawRawTx(vaultAddress: string, args: VaultWithdrawArgs): RawTx {
  const normalizedAmount = normalizeVaultAmount(args);
  const asset = args.assetType === AssetType.Native ? ZERO_ADDRESS : args.asset;

  return {
    to: vaultAddress,
    value: ethers.constants.Zero,
    data: iface.encodeFunctionData("withdraw", [
      args.assetType,
      asset,
      ethers.BigNumber.from(args.id),
      normalizedAmount,
    ]),
  };
}
