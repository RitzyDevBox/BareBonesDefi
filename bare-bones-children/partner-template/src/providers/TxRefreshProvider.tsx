import { createContext, useContext, useState, useCallback, useRef } from "react";
import { DEFAULT_REFRESH_DELAY } from "../constants/misc";

type TxMeta = {
  hash?: string;
  message?: string;
};

type TxRefreshContextValue = {
  version: number;
  triggerRefresh: (meta?: TxMeta) => void;
};

const TxRefreshContext = createContext<TxRefreshContextValue | null>(null);

export function TxRefreshProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerRefresh = useCallback((_meta?: TxMeta) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      setVersion((v) => v + 1);
      refreshTimeoutRef.current = null;
    }, DEFAULT_REFRESH_DELAY);
  }, []);

  return (
    <TxRefreshContext.Provider value={{ version, triggerRefresh }}>
      {children}
    </TxRefreshContext.Provider>
  );
}

export function useTxRefresh() {
  const ctx = useContext(TxRefreshContext);
  if (!ctx) {
    throw new Error("useTxRefresh must be used within TxRefreshProvider");
  }
  return ctx;
}
