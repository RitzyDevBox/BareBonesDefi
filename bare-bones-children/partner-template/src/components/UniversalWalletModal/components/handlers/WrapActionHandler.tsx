import { useEffect } from "react";
import { useShimWallet } from "../../../../hooks/useShimWallet";
import { WrapModalResponse } from "../../schemas/wrap.schema";
import { useWrapCallback, } from "../../hooks/useWrapCallback";
import { DEFAULT_CHAIN_ID, WETH_BY_CHAIN } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";


interface Props extends ActionHandlerProps<WrapModalResponse>{}

function WrapActionHandler({ values, walletAddress, onDone, lifeCycle }: Props) {
  const { provider } = useShimWallet();
  const { wrap } = useWrapCallback(provider, walletAddress);

  useEffect(() => {
    if (!provider) return;

    async function run() {
      const args = {
        amount: values.amount,
        wethAddress: WETH_BY_CHAIN[DEFAULT_CHAIN_ID],
      };

      await wrap(args, lifeCycle);
      onDone();
    }

    run();
  }, [provider, values, wrap, onDone, walletAddress, lifeCycle]);

  return null;
}

export default WrapActionHandler