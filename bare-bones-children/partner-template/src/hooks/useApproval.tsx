import { useCallback, useEffect, useState } from "react";
import { Contract, BigNumberish, providers, constants } from "ethers";
import ERC20_ABI from "../abis/ERC20.json";

export enum ApprovalState {
  UNKNOWN = "UNKNOWN",
  NOT_APPROVED = "NOT_APPROVED",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
}

export function useApproval(
  provider?: providers.Web3Provider,
  tokenAddress?: string,
  spenderAddress?: string,
  ownerAddress?: string | null
) {
  const [approvalState, setApprovalState] = useState<ApprovalState>(
    ApprovalState.UNKNOWN
  );

  const checkAllowance = useCallback(async () => {
    if (!provider || !tokenAddress || !spenderAddress || !ownerAddress) {
      setApprovalState(ApprovalState.UNKNOWN);
      return;
    }
    try {
      const erc20 = new Contract(tokenAddress, ERC20_ABI, provider);
      const allowance = await erc20.allowance(ownerAddress, spenderAddress);

      if (allowance.gt(0)) {
        setApprovalState(ApprovalState.APPROVED);
      } else {
        setApprovalState(ApprovalState.NOT_APPROVED);
      }
    } catch (err) {
      console.error("Failed to check allowance:", err);
      setApprovalState(ApprovalState.UNKNOWN);
    }
  }, [provider, tokenAddress, spenderAddress, ownerAddress]);

  useEffect(() => {
    checkAllowance();
  }, [checkAllowance]);

  const approve = useCallback(
    async (amount?: BigNumberish): Promise<string> => {
      if (!provider || !tokenAddress || !spenderAddress) {
        throw new Error("Missing provider, token, or spender");
      }

      setApprovalState(ApprovalState.PENDING);
      const signer = provider.getSigner();
      const erc20 = new Contract(tokenAddress, ERC20_ABI, signer);

      const approveAmount = amount ?? constants.MaxUint256;
      const tx = await erc20.approve(spenderAddress, approveAmount);
      const receipt = await tx.wait();

      // Re-check after mined
      await checkAllowance();

      return receipt.transactionHash as string;
    },
    [provider, tokenAddress, spenderAddress, checkAllowance]
  );

  return { approvalState, approve };
}
