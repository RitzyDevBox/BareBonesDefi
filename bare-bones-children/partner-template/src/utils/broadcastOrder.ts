import { DutchOrder } from "@uniswap/uniswapx-sdk";

const baseUrl = import.meta.env.VITE_API_BASE_URL;
export async function broadcastOrder(
    order: DutchOrder,
    signature: string,
    chainId: number
  ) {
    try {
      const res = await fetch(`${baseUrl}/fill-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            info: order.info, // struct from buildDutchOrder
            signature,
          },
          chainId,
        }),
      });
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error: ${res.status} ${text}`);
      }
  
      return await res.json();
    } catch (err) {
      console.error("❌ Failed to send order:", err);
      throw err;
    }
  }
  