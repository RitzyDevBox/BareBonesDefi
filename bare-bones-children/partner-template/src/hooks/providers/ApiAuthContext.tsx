import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, getJwt, setJwt } from "../../api/client";
import { ApiError, ApiUser } from "../../api/types";
import { signInWithEthereum } from "../../api/siwe";
import { useWalletProvider } from "../useWalletProvider";

export interface ApiAuthContextValue {
  /** Signed-in user's full profile (PII included) or null when not signed in. */
  user: ApiUser | null;
  /** True while a /profile fetch, sign-in, or profile update is in flight. */
  loading: boolean;
  /** Last failure code from sign-in (cleared on next attempt). */
  error: string | null;
  /** True when both a JWT exists AND the matching profile has been fetched. */
  isSignedIn: boolean;
  /** Trigger SIWE flow against the connected wallet; resolves on success. */
  signIn: () => Promise<void>;
  /** Forget JWT + profile state. */
  signOut: () => void;
  /** Re-fetch /profile from the API (used after external profile updates). */
  refresh: () => Promise<void>;
  /** Update the auth user's email and reflect in `user`. */
  setEmail: (email: string | null) => Promise<void>;
}

const ApiAuthContext = createContext<ApiAuthContextValue | null>(null);

export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const { provider, account, chainId } = useWalletProvider();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getJwt()) {
      setUser(null);
      return;
    }
    setLoading(true);
    try {
      const profile = await api.profile.get();
      setUser(profile);
    } catch (err) {
      // 401 → JWT expired/invalid; drop it. Anything else just leaves
      // user state untouched (transient network error).
      if (err instanceof ApiError && err.status === 401) {
        setJwt(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: if there's a JWT in storage, try to load the profile.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // If the connected wallet changes (or disconnects), drop the JWT — it was
  // bound to a different address and is no longer this user's session.
  useEffect(() => {
    if (!user) return;
    if (!account) {
      setJwt(null);
      setUser(null);
      return;
    }
    if (user.walletAddress.toLowerCase() !== account.toLowerCase()) {
      setJwt(null);
      setUser(null);
    }
  }, [user, account]);

  const signIn = useCallback(async () => {
    setError(null);
    if (!provider || !account || chainId == null) {
      setError("connect_wallet_first");
      return;
    }
    setLoading(true);
    try {
      const jwt = await signInWithEthereum({ provider, address: account, chainId });
      setJwt(jwt);
      const profile = await api.profile.get();
      setUser(profile);
    } catch (err) {
      const code =
        err instanceof ApiError
          ? err.code
          : err instanceof Error
            ? err.message
            : "sign_in_failed";
      setError(code);
    } finally {
      setLoading(false);
    }
  }, [provider, account, chainId]);

  const signOut = useCallback(() => {
    setJwt(null);
    setUser(null);
    setError(null);
  }, []);

  const setEmail = useCallback(async (email: string | null) => {
    setLoading(true);
    try {
      const profile = await api.profile.update({ email });
      setUser(profile);
    } finally {
      setLoading(false);
    }
  }, []);

  const value: ApiAuthContextValue = {
    user,
    loading,
    error,
    isSignedIn: !!user,
    signIn,
    signOut,
    refresh,
    setEmail,
  };

  return (
    <ApiAuthContext.Provider value={value}>{children}</ApiAuthContext.Provider>
  );
}

export function useApiAuthContext() {
  const ctx = useContext(ApiAuthContext);
  if (!ctx) {
    throw new Error("useApiAuth must be used inside ApiAuthProvider");
  }
  return ctx;
}
