import { useEffect, useState } from "react";

const MapChainIdToSlug: Record<number, string> = {
  1: "ethereum",
  137: "polygon-pos",
  10: "optimistic-ethereum",
  999: "hyperevm",
};

export interface TokenInfo {
  chainId?: number;
  address: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

interface Props {
  chainId: number | null;
  label: string; // ✅ added
  onSelect: (token: TokenInfo | { type: "native"; symbol: string; decimals: number }) => void;
}

export function TokenPicker({ chainId, label, onSelect }: Props) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTokenList(cid: number) {
      const slug = MapChainIdToSlug[cid];
      if (!slug) return;
      try {
        setLoading(true);
        const url = `https://tokens.coingecko.com/${slug}/all.json`;
        const res = await fetch(url);
        const data = await res.json();
        setTokens(data.tokens.filter((t: TokenInfo) => t.chainId === cid));
      } catch (e) {
        console.error("Token load error:", e);
      } finally {
        setLoading(false);
      }
    }
    if (chainId) loadTokenList(chainId);
    else setTokens([]);
  }, [chainId]);

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label>
        {label}:
        <select
          disabled={!chainId || loading}
          onChange={(e) => {
            if (e.target.value === "native") {
              const slug = chainId ? MapChainIdToSlug[chainId] : "unknown";
              onSelect({ type: "native", symbol: `Native (${slug})`, decimals: 18 });
            } else {
              const token = tokens.find((t) => t.address === e.target.value);
              if (token) onSelect(token);
            }
          }}
        >
          <option value="">-- Select Token --</option>
          {chainId && (
            <option value="native" data-decimals="18">
              Native ({MapChainIdToSlug[chainId]})
            </option>
          )}
          {tokens.map((t) => (
            <option key={t.address} value={t.address} data-decimals={t.decimals}>
              {t.symbol}
            </option>
          ))}
        </select>
      </label>
      {loading && <p>Loading tokens…</p>}
    </div>
  );
}
