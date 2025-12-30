import { useEffect, useRef, useState } from "react";
import { CHAIN_INFO_MAP } from "../../constants/misc";
import { TokenInfo } from "./types";

export function useTokenList(chainId: number | null) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!chainId) {
      setTokens([]);
      return;
    }

    const requestId = ++requestRef.current;

    async function loadTokenList(cid: number) {
      const slug = CHAIN_INFO_MAP[cid]?.coinGeckoSlug;
      if (!slug) return;

      try {
        setLoading(true);

        const res = await fetch(
          `https://tokens.coingecko.com/${slug}/all.json`
        );
        const data = await res.json();

        // 🔒 ignore stale responses
        if (requestRef.current !== requestId) return;

        setTokens(
          data.tokens.filter((t: TokenInfo) => t.chainId === cid)
        );
      } catch (e) {
        if (requestRef.current === requestId) {
          console.error("Token load error:", e);
        }
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false);
        }
      }
    }

    loadTokenList(chainId);
  }, [chainId]);

  return { tokens, loading };
}
