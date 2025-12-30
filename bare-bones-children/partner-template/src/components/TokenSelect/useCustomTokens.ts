import { useEffect, useState } from "react";
import { TokenInfo } from "./types";

function storageKey(chainId: number) {
  return `custom-tokens:${chainId}`;
}

export function useCustomTokens(chainId: number | null) {
  const [customTokens, setCustomTokens] = useState<TokenInfo[]>([]);

  useEffect(() => {
    if (!chainId) return;
    const raw = localStorage.getItem(storageKey(chainId));
    setCustomTokens(raw ? JSON.parse(raw) : []);
  }, [chainId]);

  function addCustomToken(token: TokenInfo) {
    if (!chainId) return;
    setCustomTokens((prev) => {
      const next = [...prev, token];
      localStorage.setItem(storageKey(chainId), JSON.stringify(next));
      return next;
    });
  }

  function removeCustomToken(address: string) {
    if (!chainId) return;

    setCustomTokens((prev) => {
        const next = prev.filter(
        (t) => t.address.toLowerCase() !== address.toLowerCase()
        );
        localStorage.setItem(storageKey(chainId), JSON.stringify(next));
        return next;
    });
  }

  return { customTokens, addCustomToken, removeCustomToken };
}
