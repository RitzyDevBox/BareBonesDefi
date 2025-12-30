import { useEffect } from "react";
import { useShimWallet } from "../../../../hooks/useShimWallet";
import { WithdrawModalResponse } from "../../schemas/withdraw.schema";

import { AssetType } from "../../models";
import { ZERO_ADDRESS } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";
import { useWalletWithdrawCallback } from "../../hooks/useWithdrawCurrencyCallback";

interface Props extends ActionHandlerProps<WithdrawModalResponse> {}
function WithdrawActionHandler({ values, walletAddress, onDone, lifeCycle }: Props) {
  const { provider } = useShimWallet();
  const { withdraw } = useWalletWithdrawCallback(provider, walletAddress);

  useEffect(() => {
    if (!provider) return;   // ✅ Prevent early effect execution

    async function run() {
      const assetType =
        values.asset.address === ZERO_ADDRESS ? AssetType.NATIVE : AssetType.ERC20;

      await withdraw({
        assetType,
        amount: values.asset.amount,
        recipient: values.recipient,
        decimals: values.asset.decimals,
        tokenSymbol: values.asset.symbol,
        tokenAddress: values.asset.address,
      }, lifeCycle);

      onDone();
    }

    run();
  }, [provider, values, withdraw, onDone, walletAddress, lifeCycle]);

  return null;
}

export default WithdrawActionHandler;
