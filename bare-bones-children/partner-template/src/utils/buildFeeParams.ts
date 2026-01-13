import { ethers } from "ethers";
import { CHAIN_INFO_MAP } from "../constants/misc";

export type FeeParams =
  | {
      gasPrice: ethers.BigNumber;
    }
  | {
      maxFeePerGas: ethers.BigNumber;
      maxPriorityFeePerGas: ethers.BigNumber;
    };

export async function buildFeeParams(
  provider: ethers.providers.Provider,
  chainId: number
): Promise<FeeParams> {
  const chain = CHAIN_INFO_MAP[chainId];
  if (!chain) throw new Error(`Unsupported chain ${chainId}`);

  const feeData = await provider.getFeeData();

  // ---------- legacy ----------
  if (!chain.supportsEip1559) {
    if (!feeData.gasPrice) {
      throw new Error("RPC did not return gasPrice");
    }
    return { gasPrice: feeData.gasPrice };
  }

  // ---------- EIP-1559 ----------
  const minTip = ethers.utils.parseUnits(
    String(chain.minPriorityFeeGwei ?? 1),
    "gwei"
  );

  const suggestedTip = ethers.BigNumber.from(
    feeData.maxPriorityFeePerGas ?? minTip
  );

  const priorityFee = suggestedTip.gt(minTip)
    ? suggestedTip
    : minTip;

  const baseFee = feeData.lastBaseFeePerGas ?? ethers.constants.Zero;

  const multiplier = chain.maxFeeMultiplier ?? {
    numerator: 2,
    denominator: 1,
  };

  const maxFee = baseFee
    .add(priorityFee)
    .mul(multiplier.numerator)
    .div(multiplier.denominator);

  return {
    maxPriorityFeePerGas: priorityFee,
    maxFeePerGas: maxFee,
  };
}

export async function buildGasLimit(
  signer: ethers.Signer,
  tx: ethers.providers.TransactionRequest,
  bufferPct = 20
): Promise<ethers.BigNumber> {
  const estimate = await signer.estimateGas(tx);
  return estimate.mul(100 + bufferPct).div(100);
}
