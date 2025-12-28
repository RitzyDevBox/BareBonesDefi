import { useEffect } from "react";
import { useShimWallet } from "../../../../hooks/useShimWallet";
import { useUnwrapCallback } from "../../hooks/useWrapCallback";
import { WETH_BY_CHAIN } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";
import { UnwrapModalResponse } from "../../schemas/unwrap.schema";


interface Props extends ActionHandlerProps<UnwrapModalResponse>{}
function UnwrapActionHandler({ values, walletAddress, onDone, lifeCycle }: Props) {
  const { provider, chainId } = useShimWallet();
  const { unwrap } = useUnwrapCallback(provider, walletAddress);

  useEffect(() => {

    async function run() {
      if (!provider || !chainId) return; 
      
      const args = {
        amount: values.amount,
        wethAddress: WETH_BY_CHAIN[chainId],
      };

      await unwrap(args, lifeCycle);
      onDone();
    }

    run();
  }, [provider, values, unwrap, onDone, walletAddress, lifeCycle, chainId]);

  return null;
}

export default UnwrapActionHandler