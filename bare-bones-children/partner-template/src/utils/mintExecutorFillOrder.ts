/* eslint-disable @typescript-eslint/no-explicit-any */
import { Contract, providers, Wallet } from "ethers";
import { DutchOrder } from "@uniswap/uniswapx-sdk";
import MINT_EXECUTOR_ABI from "../abis/MintExecutor.abi.json"; // make sure you have ABI
const MintExecutorAddress = "0x2aF2E4A2708058C1252788A0E3cc5b42B0aE336F";

export async function mintExecutorFillOrder(
  signer: providers.JsonRpcSigner,
  order: DutchOrder,
  signature: string,
) {
  // 1. Build the SignedOrder struct
  const signedOrder = {
    order: order.serialize(), // serialized DutchOrder bytes
    sig: signature,
  };

  const callbackData = '0x00'


  // 3. Connect contract
  const executor = new Contract(MintExecutorAddress, MINT_EXECUTOR_ABI, signer);

  // 4. Dry-run with callStatic
  try {
    await executor.callStatic.execute(signedOrder, callbackData);
    console.log("✅ callStatic success — transaction should succeed");
  } catch (err: any) {
    console.error("❌ callStatic reverted:", err);
    throw new Error(err?.reason || err?.message || "callStatic failed");
  }

  // 5. Execute for real
  const gasLimit = await executor.estimateGas.execute(signedOrder, callbackData);
  const tx = await executor.execute(signedOrder, callbackData, { gasLimit });

  console.log("Processing Order TX Hash:", tx.hash);
  return tx.wait();
}
