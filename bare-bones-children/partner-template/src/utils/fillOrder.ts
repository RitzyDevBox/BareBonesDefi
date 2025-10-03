/* eslint-disable @typescript-eslint/no-explicit-any */
import { DutchOrder } from "@uniswap/uniswapx-sdk";
import { SwapRouter02ExecutorAddress } from "../constants/misc";
import SWAP_ROUTER02_EXECUTOR_ABI from "../abis/SwapRouter02Executor.json";
import { BigNumberish, Contract, ethers, providers, utils } from "ethers";
import { QuoteResponse } from "./getOrderQuote";

export async function fillOrder(
  provider: providers.Web3Provider,
  order: DutchOrder,
  tokenInAddress: string,
  tokenOutAddress: string,
  signature: string,
  chainId: number,
  swapData: QuoteResponse | null,
) {
  if (!swapData) {
    console.log("Cannot Execute swap — no quote loaded");
    return;
  }

  const signer = provider.getSigner();

  // 1. Build the SignedOrder struct
  const signedOrder = {
    order: order.serialize(), // serialized DutchOrder bytes
    sig: signature,
  };

  // 2. Prepare multicallData for executor
  const tokensToApproveForSwapRouter02 = [tokenInAddress];
  const tokensToApproveForReactor: string[] = [tokenInAddress, tokenOutAddress]; // usually empty

  let multicallData: string[];

  // Detect if swapData.bestPath.calldata is itself a multicall
  const selector = swapData.bestPath.calldata.slice(0, 10).toLowerCase();
  if (selector === "0x5ae401dc") {
    // Decode inner calls
    const decoded = utils.defaultAbiCoder.decode(
      ["uint256", "bytes[]"],
      "0x" + swapData.bestPath.calldata.slice(10)
    );
    multicallData = decoded[1]; // inner bytes[]
  } else {
    // Normal case
    multicallData = [swapData.bestPath.calldata];
  }

  const callbackData = utils.defaultAbiCoder.encode(
    ["address[]", "address[]", "bytes[]"],
    [tokensToApproveForSwapRouter02, tokensToApproveForReactor, multicallData]
  );

  // 3. Connect contract
  const executor = new Contract(
    SwapRouter02ExecutorAddress,
    SWAP_ROUTER02_EXECUTOR_ABI,
    signer
  );

  // 4. Dry-run with callStatic
  try {
    await executor.callStatic.execute(signedOrder, callbackData, {
      value: swapData.bestPath.value as BigNumberish,
    });
    console.log("✅ callStatic success — transaction should succeed");
  } catch (err: any) {
    console.error("❌ callStatic reverted:", err);
    throw new Error(err?.reason || err?.message || "callStatic failed");
  }

  // 5. Execute for real
  const tx = await executor.execute(signedOrder, callbackData, {
    value: swapData.bestPath.value,
    gasLimit: 1_000_000, // adjust
  });

  return tx.wait();
}

export async function verifyUniswapXSignature(
  signerAddress: string,
  domain: any,
  types: any,
  message: any,
  signature: string
): Promise<boolean> {
  const recovered = ethers.utils.verifyTypedData(domain, types, message, signature);
  return recovered.toLowerCase() === signerAddress.toLowerCase();
}
