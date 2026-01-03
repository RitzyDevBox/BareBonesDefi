import { useEffect } from "react";
import { useWalletProvider } from "../../../../hooks/useWalletProvider";
import { useUnwrapCallback } from "../../hooks/useWrapCallback";
import { ActionHandlerProps } from "./models";
import { UnwrapModalResponse } from "../../schemas/unwrap.schema";
import { CHAIN_INFO_MAP } from "../../../../constants/misc";


interface Props extends ActionHandlerProps<UnwrapModalResponse>{}
function UnwrapActionHandler({ values, walletAddress, onDone, lifeCycle }: Props) {
  const { provider, chainId } = useWalletProvider();
  const { unwrap } = useUnwrapCallback(provider, walletAddress);

  useEffect(() => {

    async function run() {
      if (!provider || !chainId) return; 
      
      const args = {
        amount: values.asset.amount,
        wethAddress: CHAIN_INFO_MAP[chainId].wethAddress,
      };

      await unwrap(args, lifeCycle);
      onDone();
    }

    run();
  }, [provider, values, unwrap, onDone, walletAddress, lifeCycle, chainId]);

  return null;
}

export default UnwrapActionHandler