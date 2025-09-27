
const quoteBaseUrl = import.meta.env.VITE_API_QUOTE_URL_BASE;

// === Types for the API response ===
export interface QuoteResponse {
  bestPath: {
    input: string;              // raw input amount
    output: string;             // raw output amount
    calldata: string;           // encoded calldata for SwapRouter02
    value: string;              // ETH value to send
    route: {
      tokenPath: string[];
      protocol: string;
      poolAddresses: string[];
    };
    swapRouterAddress: string;  // router to call
  };
}

/**
 * Request a swap quote from the Smart Order Router API
 */
export async function getQuote(params: {
  inputTokenAddress: string;
  outputTokenAddress: string;
  inputTokenDecimals?: number;
  outputTokenDecimals?: number;
  inputTokenSymbol?: string;
  outputTokenSymbol?: string;
  amountIn: string;
  recipient: string;
  slippageTolerance?: string | number; // bps
  deadlineMinutes?: string | number;
  chainId: number;
  isExactIn?: boolean;
}): Promise<QuoteResponse> {
  try {
    const res = await fetch(`${quoteBaseUrl}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error: ${res.status} ${text}`);
    }

    const data: QuoteResponse = await res.json();
    return data;
  } catch (err) {
    console.error("❌ Failed to fetch quote:", err);
    throw err;
  }
}
