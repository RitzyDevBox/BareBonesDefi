import { useEffect } from "react";
import { useWalletProvider } from "../../../../hooks/useWalletProvider";

import { DepositModalResponse } from "../../schemas/deposit.schema";
import { AssetType } from "../../models";
import { ZERO_ADDRESS } from "../../../../constants/misc";
import { ActionHandlerProps } from "./models";
import { useDepositCurrencyCallback } from "../../hooks/useDepositCurrencyCallback";

interface Props extends ActionHandlerProps<DepositModalResponse> {}
function DepositActionHandler({ values, walletAddress, onDone, lifeCycle }: Props) {
  const { provider } = useWalletProvider();
  const { deposit } = useDepositCurrencyCallback(provider);

  useEffect(() => {
    async function run() {
      if (!provider || values.asset.token === null) return; 
      const assetType =
        values.asset.token.address === ZERO_ADDRESS
          ? AssetType.NATIVE
          : AssetType.ERC20;

      await deposit({
        assetType,
        amount: values.asset.amount,
        decimals: values.asset.token.decimals,
        tokenSymbol: values.asset.token.symbol,
        tokenAddress: values.asset.token.address,
        recipient: walletAddress
      }, lifeCycle);

      onDone();
    }

    run();
  }, [provider, values, deposit, onDone, walletAddress, lifeCycle]);

  return null;
}

export default DepositActionHandler;
