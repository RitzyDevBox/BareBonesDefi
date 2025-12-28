import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useShimWallet } from "../hooks/useShimWallet";
import { CHAIN_INFO_MAP } from "../constants/misc";

export interface TokenInfo {
  chainId?: number;
  address: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

interface Props {
  chainId: number | null;
  label: string;
  onSelect: (token: TokenInfo | { type: "native"; symbol: string; decimals: number }) => void;
}

export function TokenPicker({ chainId, label, onSelect }: Props) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // for custom token
  const [customAddress, setCustomAddress] = useState("");
  const [customToken, setCustomToken] = useState<TokenInfo | null>(null);
  const { provider } = useShimWallet()

  useEffect(() => {
    async function loadTokenList(cid: number) {
      const slug = CHAIN_INFO_MAP[cid].coinGeckoSlug;
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

  async function handleCustomAddress(addr: string) {
    setCustomAddress(addr);
    if (!addr || !ethers.utils.isAddress(addr) || !chainId) {
      setCustomToken(null);
      return;
    }

    try {
      const erc20 = new ethers.Contract(
        addr,
        [
          "function symbol() view returns (string)",
          "function decimals() view returns (uint8)",
        ],
        provider
      );

      const symbol = erc20.symbol()
      const decimals = await erc20.decimals()
      // const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()]);
      const token: TokenInfo = {
        chainId,
        address: addr,
        symbol,
        decimals,
      };
      setCustomToken(token);
      onSelect(token);
    } catch (err) {
      console.warn("Custom token fetch failed, fallback to manual:", err);
      setCustomToken(null);
    }
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label>
        {label}:
        <select
          disabled={!chainId || loading}
          onChange={(e) => {
            if (e.target.value === "native") {
              const slug = chainId ? CHAIN_INFO_MAP[chainId].coinGeckoSlug : "unknown";
              onSelect({ type: "native", symbol: `Native (${slug})`, decimals: 18 });
              setCustomAddress("");
              setCustomToken(null);
            } else if (e.target.value === "custom") {
              // just show input, don’t trigger select yet
            } else {
              const token = tokens.find((t) => t.address === e.target.value);
              if (token) {
                onSelect(token);
                setCustomAddress("");
                setCustomToken(null);
              }
            }
          }}
        >
          <option value="">-- Select Token --</option>
          {chainId && (
            <option value="native">Native ({CHAIN_INFO_MAP[chainId].coinGeckoSlug})</option>
          )}
          <option value="custom">➕ Custom token…</option>
          {tokens.map((t) => (
            <option key={t.address} value={t.address}>
              {t.symbol}
            </option>
          ))}
        </select>
      </label>

      {loading && <p>Loading tokens…</p>}

      {/* Custom input */}
      <div style={{ marginTop: "0.5rem" }}>
        <input
          type="text"
          placeholder="Paste token address"
          value={customAddress}
          onChange={(e) => handleCustomAddress(e.target.value)}
          style={{ width: "100%" }}
        />
        {customToken && (
          <p>
            ✅ Detected {customToken.symbol} (decimals {customToken.decimals})
          </p>
        )}
      </div>
    </div>
  );
}
