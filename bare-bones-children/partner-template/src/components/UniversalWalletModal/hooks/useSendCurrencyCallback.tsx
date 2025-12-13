/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { ethers } from "ethers";
import BASIC_WALLET_FACET_ABI from "../../../abis/diamond/facets/basicWalletFacet.abi.json";
import { AssetType } from "../../../pages/BasicWalletFacetPage";

interface SendCurrencyArgs {
  assetType: AssetType;
  amount: string;
  recipient: string;
  decimals?: number | null;
  tokenSymbol?: string;
  tokenAddress?: string;
}

export function useSendCurrencyCallback(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string
) {
  const sendCurrencyCallback = useCallback(
    async (
      args: SendCurrencyArgs,
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
          recipient,
          decimals,
          tokenSymbol,
          tokenAddress,
        } = args;

        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          diamondAddress,
          BASIC_WALLET_FACET_ABI,
          signer
        );

        if (assetType === AssetType.NATIVE) {
          const amt = ethers.utils.parseEther(amount);

          opts?.onLog?.(`Sending ${amount} ETH to ${recipient}`);

          const tx = await contract.sendETH(recipient, amt);
          opts?.onLog?.("Tx: " + tx.hash);

          await tx.wait();
          opts?.onLog?.("Native transfer complete!");

          opts?.onComplete?.();
          return;
        }

        if (!tokenAddress) {
          throw new Error("Missing tokenAddress for ERC20 send");
        }

        const amt = ethers.utils.parseUnits(amount, decimals ?? 18);
        opts?.onLog?.(`Sending ${amount} ${tokenSymbol ?? ""} to ${recipient}`);

        const tx = await contract.sendERC20(tokenAddress, recipient, amt);
        opts?.onLog?.("Tx: " + tx.hash);

        await tx.wait();
        opts?.onLog?.("Transfer complete!");

        opts?.onComplete?.();
      } catch (err) {
        opts?.onError?.(err);
      }
    },
    [provider, diamondAddress]
  );

  return { sendCurrencyCallback };
}
