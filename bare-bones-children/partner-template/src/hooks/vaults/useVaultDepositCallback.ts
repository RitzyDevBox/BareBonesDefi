import { ethers } from "ethers";
import { useCallback } from "react";
import { wrapWithExecute } from "../../utils/transactionUtils";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { buildSendERC20RawTx } from "../../utils/basicWalletUtils";
import { AssetType } from "../../models/vaults/vaultTypes";

export interface VaultDepositArgs {
  assetType: AssetType;
  asset: string;
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

    if (args.assetType === AssetType.Native) {
      return wrapWithExecute(provider, walletAddress, {
        to: vaultAddress,
        value: ethers.utils.parseEther(args.amount),
        data: "0x",
      })();
    }

    const rawTx = buildSendERC20RawTx(args.asset, vaultAddress, args.amount, args.decimals);
    return wrapWithExecute(provider, walletAddress, rawTx)();
  }, [provider, vaultAddress, walletAddress]);

  const statusMessage = useCallback((args: VaultDepositArgs) => {
    const symbol = args.assetType === AssetType.Native ? "Native" : args.asset;
    return `Depositing ${args.amount} ${symbol} into vault`;
  }, []);

  const deposit = useExecuteRawTx(buildDepositTx, statusMessage);

  return { deposit };
}
