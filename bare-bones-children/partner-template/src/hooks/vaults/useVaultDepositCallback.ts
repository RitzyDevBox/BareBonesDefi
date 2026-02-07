import { ethers } from "ethers";
import { useCallback } from "react";
import { wrapWithExecute } from "../../utils/transactionUtils";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { AssetType } from "../../models/vaults/vaultTypes";
import { buildERC1155DepositRawTx, buildERC721DepositRawTx, buildSendERC20RawTx } from "../../utils/basicWalletUtils";

export interface VaultDepositArgs {
  assetType: AssetType;
  asset: string;
  id?: string;
  amount: string;
  decimals?: number | null;
}

export function useVaultDepositCallback(
  provider: ethers.providers.Web3Provider | undefined,
  vaultAddress: string,
  walletAddress: string
) {
  const buildDepositTx = useCallback((args: VaultDepositArgs) => {
    if (!provider) throw new Error("No provider");

    switch (args.assetType) {
      case AssetType.Native:
        const rawTx = {
          to: vaultAddress,
          value: ethers.utils.parseEther(args.amount),
          data: "0x",
        }
        return wrapWithExecute(provider, walletAddress, rawTx)();

      case AssetType.ERC20: {
        const rawTx = buildSendERC20RawTx(args.asset, vaultAddress, args.amount, args.decimals);
        return wrapWithExecute(provider, walletAddress, rawTx)();
      }

      case AssetType.ERC721: {
        if (!args.id) throw new Error("Missing token ID");
        const rawTx = buildERC721DepositRawTx(args.asset, walletAddress, vaultAddress, args.id);
        return wrapWithExecute(provider, walletAddress, rawTx)();
      }

      case AssetType.ERC1155: {
        if (!args.id) throw new Error("Missing token ID");
        const rawTx = buildERC1155DepositRawTx(args.asset, walletAddress, vaultAddress, args.id, args.amount);
        return wrapWithExecute(provider, walletAddress, rawTx)();
      }

      default:
        throw new Error("Unsupported asset type");
    }
  }, [provider, vaultAddress, walletAddress]);

  const statusMessage = useCallback((args: VaultDepositArgs) => {
    switch (args.assetType) {
      case AssetType.Native:
        return `Depositing ${args.amount} Native`;
      case AssetType.ERC20:
        return `Depositing ${args.amount} ERC20`;
      case AssetType.ERC721:
        return `Depositing ERC721 #${args.id}`;
      case AssetType.ERC1155:
        return `Depositing ${args.amount} of ERC1155 #${args.id}`;
    }
  }, []);

  const deposit = useExecuteRawTx(buildDepositTx, statusMessage);

  return { deposit };
}
