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
  signature: string,
  chainId: number,
  swapData: QuoteResponse | null,
) {

  if(!swapData) {
    console.log('Cannot Execute swap there is no quote loaded');
    return;
  }

  const signer = provider.getSigner();

  // 1. Build the SignedOrder struct
  const signedOrder = {
    order: order.serialize(), // serialized DutchOrder bytes
    sig: signature,
  };

  // 2. Encode callbackData for executor
  const tokensToApproveForSwapRouter02 = [tokenInAddress];
  const tokensToApproveForReactor: string[] = []; // often empty
  const multicallData = [swapData.bestPath.calldata];

  const callbackData = utils.defaultAbiCoder.encode(
    ["address[]", "address[]", "bytes[]"],
    [tokensToApproveForSwapRouter02, tokensToApproveForReactor, multicallData]
  );

  // 3. Get contract
  const executor = new Contract(
    SwapRouter02ExecutorAddress, // indexed per chain
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

  // 4. Call execute
  const tx = await executor.execute(signedOrder, callbackData, {
    value: swapData.bestPath.value, // attach ETH if native input
    gasLimit: 1_000_000,   // adjust as needed
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
