import { useEffect } from "react";
import { useShimWallet } from "../../../../hooks/useShimWallet";
import { SendModalResponse } from "../../schemas/send.schema";
import { useSendCurrencyCallback } from "../../hooks/useSendCurrencyCallback";
import { AssetType, ZERO_ADDRESS } from "../../../../pages/BasicWalletFacetPage";


interface Props {
  values: SendModalResponse;
  walletAddress: string;
  onDone: () => void;
}

function SendActionHandler({ values, walletAddress, onDone }: Props) {
  const { provider } = useShimWallet();
  const { sendCurrencyCallback } = useSendCurrencyCallback(provider, walletAddress);

  useEffect(() => {
    async function run() {
      const assetType = values.asset === ZERO_ADDRESS ? AssetType.NATIVE : AssetType.ERC20;
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
  }, [values, sendCurrencyCallback, onDone, walletAddress]);

  return null; // headless
}

export default SendActionHandler;
