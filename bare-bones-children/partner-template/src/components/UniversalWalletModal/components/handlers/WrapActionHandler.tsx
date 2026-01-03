import { useEffect } from "react";
import { useWalletProvider } from "../../../../hooks/useWalletProvider";
import { WrapModalResponse } from "../../schemas/wrap.schema";
import { useWrapCallback, } from "../../hooks/useWrapCallback";
import { ActionHandlerProps } from "./models";
import { CHAIN_INFO_MAP } from "../../../../constants/misc";


interface Props extends ActionHandlerProps<WrapModalResponse>{}

function WrapActionHandler({ values, walletAddress, onDone, lifeCycle }: Props) {
  const { provider, chainId } = useWalletProvider();
  const { wrap } = useWrapCallback(provider, walletAddress);

  useEffect(() => {
    async function run() {
      if (!provider || !chainId) return;
      const args = {
        amount: values.asset.amount,
        wethAddress: CHAIN_INFO_MAP[chainId].wethAddress,
      };

      await wrap(args, lifeCycle);
      onDone();
    }

    run();
  }, [provider, values, wrap, onDone, walletAddress, lifeCycle, chainId]);

  return null;
}

export default WrapActionHandler