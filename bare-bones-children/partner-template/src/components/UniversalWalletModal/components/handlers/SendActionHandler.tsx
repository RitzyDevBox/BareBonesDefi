import { useEffect } from "react";
import { useShimWallet } from "../../../../hooks/useShimWallet";
import { SendModalResponse } from "../../schemas/send.schema";
import { useSendCurrencyCallback } from "../../hooks/useSendCurrencyCallback";
import { AssetType } from "../../models";
import { ZERO_ADDRESS } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";

interface Props extends ActionHandlerProps<SendModalResponse> {}
function SendActionHandler({ values, walletAddress, onDone }: Props) {
  const { provider } = useShimWallet();
  const { sendCurrencyCallback } = useSendCurrencyCallback(provider, walletAddress);

  useEffect(() => {
    if (!provider) return;   // ✅ Prevent early effect execution

    async function run() {
      const assetType =
        values.asset === ZERO_ADDRESS ? AssetType.NATIVE : AssetType.ERC20;

      await sendCurrencyCallback({
        assetType,
        amount: values.amount,
        recipient: values.recipient,
        decimals: values.assetInfo.decimals,
        tokenSymbol: values.assetInfo.symbol,
        tokenAddress: values.asset,
      });

      onDone();
    }

    run();
  }, [provider, values, sendCurrencyCallback, onDone, walletAddress]);

  return null;
}

export default SendActionHandler;
