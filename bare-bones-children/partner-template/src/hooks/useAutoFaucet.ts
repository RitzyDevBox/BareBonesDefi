import { useEffect } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "./useWalletProvider";
import { CHAIN_INFO_MAP } from "../constants/misc";
import { faucetAnvil, getNativeBalance, maybeMintMockTokens } from "../utils/faucetUtils";
import { toastStore } from "../components/Toasts/toast.store";
import { ToastBehavior, ToastPosition, ToastType } from "../components/Toasts/toast.types";

const AUTO_FAUCET_THRESHOLD_ETH = "1";

/** When connected to an Anvil-style testnet with a low native balance, top the
 *  account back up to a usable amount via the staging `/faucet` endpoint (or
 *  direct `anvil_setBalance` against a raw local Anvil). Surfaces toasts so
 *  the user can see why their balance jumped; failures are logged but never
 *  thrown so a non-Anvil testnet or RPC blip can't break the app. */
export function useAutoFaucet() {
  const { account, chainId } = useWalletProvider();

  useEffect(() => {
    if (!account || chainId == null) return;
    const chain = CHAIN_INFO_MAP[chainId];
    if (!chain?.testnet) return;

    let cancelled = false;
    const inProgressId = `auto-faucet-progress-${account}-${chainId}`;

    (async () => {
      try {
        const balance = await getNativeBalance(account, chainId);
        if (cancelled) return;

        const threshold = ethers.utils.parseEther(AUTO_FAUCET_THRESHOLD_ETH);
        const ethNeedsTopUp = balance.lt(threshold);

        if (ethNeedsTopUp) {
          toastStore.show({
            id: inProgressId,
            title: "Topping up test ETH…",
            message: `Balance below ${AUTO_FAUCET_THRESHOLD_ETH} ETH on ${chain.chainName}. Requesting faucet.`,
            type: ToastType.Info,
            behavior: ToastBehavior.Persistent,
            position: ToastPosition.Top,
          });

          await faucetAnvil(account, chainId);
          toastStore.close(inProgressId);
          if (cancelled) return;

          toastStore.show({
            id: `auto-faucet-success-${Date.now()}`,
            title: "Test ETH delivered",
            message: "Topped your account up to 100 ETH.",
            type: ToastType.Success,
            behavior: ToastBehavior.AutoClose,
            durationMs: 4000,
            position: ToastPosition.Top,
          });
        }

        // Even if ETH was already funded, the user may have arrived with no
        // governance/payment tokens (initial supply went to a fixed treasury).
        // Mint mock tokens via anvil's unlocked default — no popup.
        const { minted } = await maybeMintMockTokens(account, chainId);
        if (!cancelled && minted.length > 0) {
          toastStore.show({
            id: `auto-faucet-tokens-${Date.now()}`,
            title: "Test tokens delivered",
            message: `Minted mock token${minted.length === 1 ? "" : "s"} to your account.`,
            type: ToastType.Success,
            behavior: ToastBehavior.AutoClose,
            durationMs: 4000,
            position: ToastPosition.Top,
          });
        }
      } catch (err) {
        toastStore.close(inProgressId);
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn("[faucet] auto-faucet failed:", err);
        toastStore.show({
          id: `auto-faucet-err-${Date.now()}`,
          title: "Auto-faucet failed",
          message: err instanceof Error ? err.message : "Unknown error",
          type: ToastType.Error,
          behavior: ToastBehavior.AutoClose,
          durationMs: 6000,
          position: ToastPosition.Top,
        });
      }
    })();

    return () => {
      cancelled = true;
      toastStore.close(inProgressId);
    };
  }, [account, chainId]);
}
