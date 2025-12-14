/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { ethers } from "ethers";
import BASIC_WALLET_FACET_ABI from "../abis/diamond/facets/basicWalletFacet.abi.json";
import { AssetType } from "../components/UniversalWalletModal/models";

export function useSendCurrency({
  provider,
  diamondAddress,
  assetType,
  amount,
  recipient,
  decimals,
  tokenSymbol,
  tokenAddress,
  appendLog,
  setShowModal,
}: {
  provider: ethers.providers.Web3Provider | undefined;
  diamondAddress: string;
  assetType: AssetType;
  amount: string;
  recipient: string;
  decimals: number | null;
  tokenSymbol: string;
  tokenAddress: string;
  appendLog: (msg: any) => void;
  setShowModal: (open: boolean) => void;
}) {
  const sendCurrency = useCallback(async () => {
    try {
      if (!provider) throw new Error("No provider");

      const signer = provider.getSigner();
      const contract = new ethers.Contract(diamondAddress, BASIC_WALLET_FACET_ABI, signer);

      if (assetType === AssetType.NATIVE) {
        const amt = ethers.utils.parseEther(amount);

        appendLog(`Sending ${amount} ETH to ${recipient}`);

        const tx = await contract.sendETH(recipient, amt);
        appendLog("Tx: " + tx.hash);

        await tx.wait();
        appendLog("Native transfer complete!");

        setShowModal(false);
        return;
      }

      const amt = ethers.utils.parseUnits(amount, decimals || 18);
      appendLog(`Sending ${amount} ${tokenSymbol} to ${recipient}`);

      const tx = await contract.sendERC20(tokenAddress, recipient, amt);
      appendLog("Tx: " + tx.hash);

      await tx.wait();
      appendLog("Transfer complete!");

      setShowModal(false);
    } catch (err) {
      appendLog("Error sending token: " + String(err));
    }
  }, [
    provider,
    diamondAddress,
    assetType,
    amount,
    recipient,
    decimals,
    tokenSymbol,
    tokenAddress,
    appendLog,
    setShowModal,
  ]);

  return { sendCurrency };
}
