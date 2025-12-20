/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";

export interface TxOpts {
  onLog?: (msg: any) => void;
  onWarn?: (message: string) => void;
  onComplete?: (message: string) => void;
  onError?: (err: any) => void;
}

export async function executeTx(
  build: () => () => Promise<any>, // returns the actual tx func
  opts?: TxOpts,
  onCompleteMessage?: string
) {
  try {
    const txFunc = build();
    const tx: any = await txFunc();
    opts?.onLog?.("Tx: " + tx.hash);

    await tx.wait();
    opts?.onLog?.("Transaction complete!");
    
    const msg = onCompleteMessage ?? "Transaction Complete";
    opts?.onComplete?.(msg);
    return tx;          // your setup logic
  } catch (err) {
    console.log('err' + (err as any).message)
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
