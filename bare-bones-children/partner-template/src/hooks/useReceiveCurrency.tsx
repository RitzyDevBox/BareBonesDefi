/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { ethers } from "ethers";
import ERC20_ABI from "../abis/ERC20.json";
import { AssetType } from "../pages/BasicWalletFacetPage";

export function useReceiveCurrency({
  provider,
  diamondAddress,
  assetType,
  amount,
  decimals,
  tokenAddress,
  tokenSymbol,
  appendLog,
  setShowModal,
}: {
  provider: ethers.providers.Web3Provider | undefined;
  diamondAddress: string;
  assetType: AssetType;
  amount: string;
  decimals: number | null;
  tokenAddress: string;
  tokenSymbol: string;
  appendLog: (msg: any) => void;
  setShowModal: (open: boolean) => void;
}) {
  const receiveCurrency = useCallback(async () => {
    try {
      if (!provider) throw new Error("No provider");

      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      if (assetType === AssetType.NATIVE) {
        const amt = ethers.utils.parseEther(amount);

        appendLog(`Depositing ${amount} ETH from ${userAddress} → ${diamondAddress}`);

        const tx = await signer.sendTransaction({
          to: diamondAddress,
          value: amt,
        });

        appendLog("Tx: " + tx.hash);
        await tx.wait();
        appendLog("Native deposit complete!");

        setShowModal(false);
        return;
      }

      const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const amt = ethers.utils.parseUnits(amount, decimals ?? 18);

      appendLog(
        `Receiving ${amount} ${tokenSymbol} from ${userAddress} → ${diamondAddress}`
      );

      const tx = await erc20.transfer(diamondAddress, amt);
      appendLog("Tx: " + tx.hash);

      await tx.wait();
      appendLog("Receive complete!");

      setShowModal(false);
    } catch (err) {
      appendLog("Error receiving token: " + String(err));
    }
  }, [
    provider,
    assetType,
    amount,
    decimals,
    tokenAddress,
    tokenSymbol,
    diamondAddress,
    appendLog,
    setShowModal,
  ]);

  return { receiveCurrency };
}
