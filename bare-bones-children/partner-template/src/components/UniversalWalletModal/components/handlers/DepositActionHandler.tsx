import { useCallback } from "react";
import { useWalletProvider } from "../../../../hooks/useWalletProvider";

import { DepositModalResponse } from "../../schemas/deposit.schema";
import { AssetType } from "../../models";
import { ZERO_ADDRESS } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";
import { useDepositCurrencyCallback } from "../../hooks/useDepositCurrencyCallback";

function DepositActionHandler({
  values,
  walletAddress,
  lifeCycle,
  children,
}: ActionHandlerProps<DepositModalResponse>) {
  const { provider } = useWalletProvider();
  const { deposit } = useDepositCurrencyCallback(provider);

  /**
   * This is the imperative action.
   * It is memoized and safe to call.
   */
  const execute = useCallback(async () => {
    if (!provider || values.asset.token === null) {
      throw new Error("Wallet not ready");
    }

    const assetType =
      values.asset.token.address === ZERO_ADDRESS
        ? AssetType.NATIVE
        : AssetType.ERC20;

    await deposit(
      {
        assetType,
        amount: values.asset.amount,
        decimals: values.asset.token.decimals,
        tokenSymbol: values.asset.token.symbol,
        tokenAddress: values.asset.token.address,
        recipient: walletAddress,
      },
      lifeCycle
    );
  }, [
    provider,
    deposit,
    values,
    walletAddress,
    lifeCycle,
  ]);

  return <>{children(execute)}</>;
}

export default DepositActionHandler;
