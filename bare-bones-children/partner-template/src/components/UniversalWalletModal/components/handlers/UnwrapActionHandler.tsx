import { useEffect } from "react";
import { useShimWallet } from "../../../../hooks/useShimWallet";
import { useUnwrapCallback } from "../../hooks/useWrapCallback";
import { DEFAULT_CHAIN_ID, WETH_BY_CHAIN } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";
import { UnwrapModalResponse } from "../../schemas/unwrap.schema";


interface Props extends ActionHandlerProps<UnwrapModalResponse>{}
function UnwrapActionHandler({ values, walletAddress, onDone }: Props) {
  const { provider } = useShimWallet();
  const { unwrapCallback } = useUnwrapCallback(provider, walletAddress);

  useEffect(() => {
    if (!provider) return; 

    async function run() {
      const args = {
        amount: values.amount,
        wethAddress: WETH_BY_CHAIN[DEFAULT_CHAIN_ID],
      };

      await unwrapCallback(args);
      onDone();
    }

    run();
  }, [provider, values, unwrapCallback, onDone, walletAddress]);

  return null;
}

export default UnwrapActionHandler