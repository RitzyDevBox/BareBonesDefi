import { createContext, useContext, useState, useCallback } from "react";

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

  const triggerRefresh = useCallback((_meta?: TxMeta) => {
    // intentionally unused for now
    // meta?.hash
    // meta?.message

    setVersion((v) => v + 1);
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
