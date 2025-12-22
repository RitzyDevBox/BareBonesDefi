import { useEffect } from "react";
import { useShimWallet } from "../../../../hooks/useShimWallet";
import { useReceiveCurrencyCallback } from "../../hooks/useReceiveCurrencyCallback";
import { ReceiveModalResponse } from "../../schemas/receive.schema";
import { AssetType } from "../../models";
import { ZERO_ADDRESS } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";

interface Props extends ActionHandlerProps<ReceiveModalResponse> {}
function ReceiveActionHandler({ values, walletAddress, onDone, lifeCycle }: Props) {
  const { provider } = useShimWallet();
  const { receiveCurrencyCallback } =
    useReceiveCurrencyCallback(provider, walletAddress);

  useEffect(() => {
    if (!provider) return;   // ✅ prevent premature execution,

    async function run() {
      const assetType =
        values.asset.address === ZERO_ADDRESS
          ? AssetType.NATIVE
          : AssetType.ERC20;

      await receiveCurrencyCallback({
        assetType,
        amount: values.amount,
        decimals: values.asset.decimals,
        tokenSymbol: values.asset.symbol,
        tokenAddress: values.asset.address,
      }, lifeCycle);

      onDone();
    }

    run();
  }, [provider, values, receiveCurrencyCallback, onDone, walletAddress, lifeCycle]);

  return null;
}

export default ReceiveActionHandler;
