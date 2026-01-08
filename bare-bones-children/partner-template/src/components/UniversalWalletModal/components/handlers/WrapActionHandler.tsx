import { useCallback } from "react";
import { useWalletProvider } from "../../../../hooks/useWalletProvider";
import { WrapModalResponse } from "../../schemas/wrap.schema";
import { useWrapCallback } from "../../hooks/useWrapCallback";
import { ActionHandlerProps } from "./models";
import { CHAIN_INFO_MAP } from "../../../../constants/misc";

function WrapActionHandler({
  values,
  walletAddress,
  lifeCycle,
  children,
}: ActionHandlerProps<WrapModalResponse>) {
  const { provider, chainId } = useWalletProvider();
  const { wrap } = useWrapCallback(provider, walletAddress);

  const execute = useCallback(async () => {
    if (!provider || !chainId) {
      throw new Error("Wallet not ready");
    }

    const args = {
      amount: values.asset.amount,
      wethAddress: CHAIN_INFO_MAP[chainId].wethAddress,
    };

    await wrap(args, lifeCycle);
  }, [provider, chainId, wrap, values, lifeCycle]);

  return <>{children(execute)}</>;
}

export default WrapActionHandler;
