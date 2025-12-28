import { useEffect, useState } from "react";
import { TokenInfo } from "./types";
import { CHAIN_INFO_MAP } from "../../constants/misc";

export function useTokenList(chainId?: number) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTokenList(cid: number) {
      const slug = CHAIN_INFO_MAP[cid].coinGeckoSlug;
      if (!slug) return;

      try {
        setLoading(true);
        const res = await fetch(
          `https://tokens.coingecko.com/${slug}/all.json`
        );
        const data = await res.json();
        setTokens(
          data.tokens.filter((t: TokenInfo) => t.chainId === cid)
        );
      } catch (e) {
        console.error("Token load error:", e);
      } finally {
        setLoading(false);
      }
    }

    if (chainId) loadTokenList(chainId);
    else setTokens([]);
  }, [chainId]);

  return { tokens, loading };
}
