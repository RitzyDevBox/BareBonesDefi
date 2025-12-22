import { useEffect } from "react";
import { useShimWallet } from "../../../../hooks/useShimWallet";
import { SendModalResponse } from "../../schemas/send.schema";
import { useSendCurrencyCallback } from "../../hooks/useSendCurrencyCallback";
import { AssetType } from "../../models";
import { ZERO_ADDRESS } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";

interface Props extends ActionHandlerProps<SendModalResponse> {}
function SendActionHandler({ values, walletAddress, onDone, lifeCycle }: Props) {
  const { provider } = useShimWallet();
  const { sendCurrencyCallback } = useSendCurrencyCallback(provider, walletAddress);

  useEffect(() => {
    if (!provider) return;   // ✅ Prevent early effect execution

    async function run() {
      const assetType =
        values.asset.address === ZERO_ADDRESS ? AssetType.NATIVE : AssetType.ERC20;

      await sendCurrencyCallback({
        assetType,
        amount: values.amount,
        recipient: values.recipient,
        decimals: values.asset.decimals,
        tokenSymbol: values.asset.symbol,
        tokenAddress: values.asset.address,
      }, lifeCycle);

      onDone();
    }

    run();
  }, [provider, values, sendCurrencyCallback, onDone, walletAddress, lifeCycle]);

  return null;
}

export default SendActionHandler;
