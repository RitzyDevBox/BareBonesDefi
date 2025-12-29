/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import EXECUTE_FACET_ABI from "../abis/diamond/facets/ExecuteFacet.abi.json";
import { RawTx } from "./basicWalletUtils";


export interface TxOpts {
  onLog?: (msg: any) => void;
  onWarn?: (message: string) => void;
  onComplete?: (message: string) => void;
  onError?: (err: any) => void;
}

export async function executeTx(
  provider: ethers.providers.Web3Provider | undefined,
  build: () => Promise<RawTx>,
  opts?: TxOpts,
  onCompleteMessage?: (receipt: ethers.providers.TransactionReceipt) => string
): Promise<ethers.providers.TransactionResponse | undefined> {
  try {
    const signer = requireSigner(provider);

    // build raw tx
    const rawTx = await build();

    // send
    const tx = await signer.sendTransaction({
      to: rawTx.to,
      data: rawTx.data,
      value: rawTx.value ?? 0,
    });

    const receipt = await tx.wait();
    const message = onCompleteMessage ? onCompleteMessage(receipt) : "Transaction Complete";
    opts?.onComplete?.(message);
    return tx;
  } catch (err) {
    opts?.onError?.(err);
    return undefined;
  }
}




export function requireSigner(provider?: ethers.providers.Web3Provider) {
  if (!provider) { 
    console.log('No Provider')
    throw new Error("No provider"); 
  }
  return provider.getSigner();
}

export function parseNative(amount: string) {
  return ethers.utils.parseEther(amount);
}

export function parseErc20(amount: string, decimals?: number | null) {
  return ethers.utils.parseUnits(amount, decimals ?? 18);
}

export function wrapWithExecute(
  provider: ethers.providers.Web3Provider | undefined,
  diamondAddress: string,
  rawTx: RawTx
): () => Promise<RawTx> {
  return async () => {
    const signer = requireSigner(provider);

    const diamond = new ethers.Contract(
      diamondAddress,
      EXECUTE_FACET_ABI,
      signer
    );

    const populated = await diamond.populateTransaction.execute(
      rawTx.to,
      rawTx.value ?? 0,
      rawTx.data
    );

    return {
      to: diamondAddress,
      data: populated.data!,
      value: populated.value ?? 0,
    };
  };
}
