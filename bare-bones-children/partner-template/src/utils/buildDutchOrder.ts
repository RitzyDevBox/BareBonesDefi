import { BigNumber } from "ethers";
import { DutchOrderBuilder } from "@uniswap/uniswapx-sdk"; 


function getDeadline(secondsFromNow: number): number {
    return Math.floor(Date.now() / 1000) + secondsFromNow;
}

/**
 * Builds a UniswapX Dutch Order
 */
export async function buildDutchOrder({
  chainId,
  reactor,
  permit2,
  swapper,            // signer or address
  tokenIn,
  tokenInAmount,
  tokenOut,
  tokenOutMinAmount,
}: {
  chainId: number;
  reactor: string;
  permit2: string;
  swapper: string;
  tokenIn: string;
  tokenInAmount: BigNumber;
  tokenOut: string;
  tokenOutMinAmount: BigNumber;
}) {
  const deadline = getDeadline(1000);

  const builder = new DutchOrderBuilder(
    chainId,
    reactor,
    permit2
  )
    .deadline(deadline)
    .decayEndTime(deadline)
    .decayStartTime(deadline - 100)
    .swapper(swapper)
    .nonce(BigNumber.from(100)) // could randomize or fetch from contract
    .input({
      token: tokenIn,
      startAmount: tokenInAmount,
      endAmount: tokenInAmount, // no decay
    })
    .output({
      token: tokenOut,
      startAmount: tokenOutMinAmount, // starting amount out
      endAmount: tokenOutMinAmount,   // fixed minimum
      recipient: swapper,
    });

  return builder.build();
}
