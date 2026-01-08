import { useCallback } from "react";
import { useWalletProvider } from "../../../../hooks/useWalletProvider";
import { useUnwrapCallback } from "../../hooks/useWrapCallback";
import { ActionHandlerProps } from "./models";
import { UnwrapModalResponse } from "../../schemas/unwrap.schema";
import { CHAIN_INFO_MAP } from "../../../../constants/misc";

function UnwrapActionHandler({
  values,
  walletAddress,
  lifeCycle,
  children,
}: ActionHandlerProps<UnwrapModalResponse>) {
  const { provider, chainId } = useWalletProvider();
  const { unwrap } = useUnwrapCallback(provider, walletAddress);

  const execute = useCallback(async () => {
    if (!provider || !chainId) {
      throw new Error("Wallet not ready");
    }

    const args = {
      amount: values.asset.amount,
      wethAddress: CHAIN_INFO_MAP[chainId].wethAddress,
    };

    await unwrap(args, lifeCycle);
  }, [provider, chainId, unwrap, values, lifeCycle]);

  return <>{children(execute)}</>;
}

export default UnwrapActionHandler;
