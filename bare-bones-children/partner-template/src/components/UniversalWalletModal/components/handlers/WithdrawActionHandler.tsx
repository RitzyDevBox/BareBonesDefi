import { useCallback } from "react";
import { useWalletProvider } from "../../../../hooks/useWalletProvider";
import { WithdrawModalResponse } from "../../schemas/withdraw.schema";
import { AssetType } from "../../models";
import { ZERO_ADDRESS } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";
import { useWalletWithdrawCallback } from "../../hooks/useWithdrawCurrencyCallback";

function WithdrawActionHandler({
  values,
  walletAddress,
  lifeCycle,
  children,
}: ActionHandlerProps<WithdrawModalResponse>) {
  const { provider } = useWalletProvider();
  const { withdraw } = useWalletWithdrawCallback(provider, walletAddress);

  const execute = useCallback(async () => {
    if (!provider || values.asset.token === null) {
      throw new Error("Wallet not ready");
    }

    const assetType = values.asset.token.address === ZERO_ADDRESS
        ? AssetType.NATIVE
        : AssetType.ERC20;

    await withdraw(
      {
        assetType,
        amount: values.asset.amount,
        recipient: values.recipient,
        decimals: values.asset.token.decimals,
        tokenSymbol: values.asset.token.symbol,
        tokenAddress: values.asset.token.address,
      }
    );
  }, [provider, withdraw, values, lifeCycle]);

  return <>{children(execute)}</>;
}

export default WithdrawActionHandler;
