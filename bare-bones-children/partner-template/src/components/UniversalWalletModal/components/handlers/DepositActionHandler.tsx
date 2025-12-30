import { useEffect } from "react";
import { useShimWallet } from "../../../../hooks/useShimWallet";

import { DepositModalResponse } from "../../schemas/deposit.schema";
import { AssetType } from "../../models";
import { ZERO_ADDRESS } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";
import { useDepositCurrencyCallback } from "../../hooks/useDepositCurrencyCallback";

interface Props extends ActionHandlerProps<DepositModalResponse> {}
function DepositActionHandler({ values, walletAddress, onDone, lifeCycle }: Props) {
  const { provider } = useShimWallet();
  const { deposit } = useDepositCurrencyCallback(provider);

  useEffect(() => {
    if (!provider) return;   // ✅ prevent premature execution,

    async function run() {
      const assetType =
        values.asset.address === ZERO_ADDRESS
          ? AssetType.NATIVE
          : AssetType.ERC20;

      await deposit({
        assetType,
        amount: values.asset.amount,
        decimals: values.asset.decimals,
        tokenSymbol: values.asset.symbol,
        tokenAddress: values.asset.address,
        recipient: walletAddress
      }, lifeCycle);

      onDone();
    }

    run();
  }, [provider, values, deposit, onDone, walletAddress, lifeCycle]);

  return null;
}

export default DepositActionHandler;
