import { useEffect } from "react";
import { useWalletProvider } from "./useWalletProvider";
import { CHAIN_INFO_MAP } from "../constants/misc";
import { maybeAutoFaucet } from "../utils/faucetUtils";

/** When connected to an Anvil-style testnet with a low native balance, top the
 *  account back up to a usable amount via `anvil_setBalance`. Failures are
 *  logged but never thrown — a non-Anvil testnet, a locked-down RPC, or a
 *  network blip should never break the app. */
export function useAutoFaucet() {
  const { account, chainId } = useWalletProvider();

  useEffect(() => {
    if (!account || chainId == null) return;
    const chain = CHAIN_INFO_MAP[chainId];
    if (!chain?.testnet) return;

    let cancelled = false;
    maybeAutoFaucet(account, chainId)
      .then((res) => {
        if (cancelled || !res.topped) return;
        // eslint-disable-next-line no-console
        console.log(`[faucet] topped up ${account} on chain ${chainId}`);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[faucet] auto-faucet failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [account, chainId]);
}
