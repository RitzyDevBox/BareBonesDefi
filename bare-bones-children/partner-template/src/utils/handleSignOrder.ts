import { OrderMetadata } from "../components/SwapForm";
import { buildDutchOrder } from "./buildDutchOrder";
import { PERMIT2_MAPPING, REACTOR_ADDRESS_MAPPING } from "@uniswap/uniswapx-sdk";
import { fillOrder, verifyUniswapXSignature } from "./fillOrder";
import { mintExecutorFillOrder } from "./mintExecutorFillOrder";
import { QuoteResponse } from "./getOrderQuote";
import { providers } from "ethers";

export async function handleSignOrder(
  provider: providers.Web3Provider,
  account: string | null,
  chainId: number | null,
  tokenInAddress: string,
  tokenOutAddress: string,
  orderMeta: OrderMetadata,
  quote: QuoteResponse | null
) {
  if (!provider || !account || !chainId || !quote) return;

  const signer = provider.getSigner();
  const { Dutch_V2: dutchReactorV2Address } = REACTOR_ADDRESS_MAPPING[chainId];
  const permit2Address = PERMIT2_MAPPING[chainId];

  if (!dutchReactorV2Address || !permit2Address) return;

  const order = await buildDutchOrder({
    chainId,
    reactor: dutchReactorV2Address,
    permit2: permit2Address,
    swapper: account,
    tokenIn: orderMeta.tokenIn.address,
    tokenOut: orderMeta.tokenOut.address,
    tokenInAmount: orderMeta.amountIn,
    tokenOutMinAmount: orderMeta.minAmountOut,
  });

  const { domain, types, values } = order.permitData();
  const signature = await signer._signTypedData(domain, types, values);

  verifyUniswapXSignature(account, domain, types, values, signature);
  mintExecutorFillOrder(signer, order, signature);
  await fillOrder(provider, order, tokenInAddress, tokenOutAddress, signature, chainId, quote);
}
