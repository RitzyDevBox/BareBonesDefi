/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { ethers } from "ethers";
import ERC20_ABI from "../../../abis/ERC20.json";
import { AssetType } from "../../../pages/BasicWalletFacetPage";

interface ReceiveCurrencyArgs {
  assetType: AssetType;
  amount: string;
  decimals?: number | null;
  tokenAddress?: string;
  tokenSymbol?: string;
}

export function useReceiveCurrencyCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const receiveCurrencyCallback = useCallback(
    async (
      args: ReceiveCurrencyArgs,
      opts?: {
        onLog?: (msg: any) => void;
        onComplete?: () => void;
        onError?: (err: any) => void;
      }
    ) => {
      try {
        if (!provider) throw new Error("No provider");

        const {
          assetType,
          amount,
          decimals,
          tokenAddress,
          tokenSymbol,
        } = args;

        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();

        // -----------------------
        // Native receive (ETH)
        // -----------------------
        if (assetType === AssetType.NATIVE) {
          const amt = ethers.utils.parseEther(amount);

          opts?.onLog?.(
            `Depositing ${amount} ETH from ${userAddress} → ${diamondAddress}`
          );

          const tx = await signer.sendTransaction({
            to: diamondAddress,
            value: amt,
          });

          opts?.onLog?.("Tx: " + tx.hash);
          await tx.wait();
          opts?.onLog?.("Native deposit complete!");

          opts?.onComplete?.();
          return;
        }

        // -----------------------
        // ERC20 receive
        // -----------------------
        if (!tokenAddress) {
          throw new Error("Missing tokenAddress for ERC20 receive");
        }

        const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const amt = ethers.utils.parseUnits(amount, decimals ?? 18);

        opts?.onLog?.(
          `Receiving ${amount} ${tokenSymbol ?? ""} from ${userAddress} → ${diamondAddress}`
        );

        const tx = await erc20.transfer(diamondAddress, amt);
        opts?.onLog?.("Tx: " + tx.hash);

        await tx.wait();
        opts?.onLog?.("Receive complete!");

        opts?.onComplete?.();
      } catch (err) {
        opts?.onError?.(err);
      }
    },
    [provider, diamondAddress]
  );

  return { receiveCurrencyCallback };
}
