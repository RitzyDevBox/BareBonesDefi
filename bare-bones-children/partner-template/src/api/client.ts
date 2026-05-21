import {
  ApiError,
  ApiNonceResponse,
  ApiUser,
  ApiVerifyResponse,
} from "./types";

// Base URL of the BareBonesApi backend. Override with VITE_API_URL for staging
// or prod deployments; defaults to the local dev port (7423). Mirrors the
// page's protocol so https pages don't trip mixed-content blocks calling http.
const defaultLocalApiUrl = (): string => {
  const scheme =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "https"
      : "http";
  return `${scheme}://localhost:7423`;
};

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? defaultLocalApiUrl();

const JWT_STORAGE_KEY = "barebones_api_jwt";

// In-memory cache so we don't re-hit localStorage on every request. Kept in
// sync with localStorage on every write.
let cachedJwt: string | null | undefined = undefined;

export function getJwt(): string | null {
  if (cachedJwt === undefined) {
    cachedJwt = localStorage.getItem(JWT_STORAGE_KEY);
  }
  return cachedJwt;
}

export function setJwt(jwt: string | null) {
  cachedJwt = jwt;
  if (jwt) {
    localStorage.setItem(JWT_STORAGE_KEY, jwt);
  } else {
    localStorage.removeItem(JWT_STORAGE_KEY);
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) ?? {}),
  };
  const jwt = getJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });

  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) code = body.error;
    } catch {
      // body wasn't JSON — keep the http_<status> code
    }
    throw new ApiError(res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  auth: {
    nonce: (address: string) =>
      request<ApiNonceResponse>("/auth/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      }),
    verify: (message: string, signature: string) =>
      request<ApiVerifyResponse>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ message, signature }),
      }),
  },
  profile: {
    get: () => request<ApiUser>("/profile"),
    update: (
      data: Partial<{
        email: string | null;
        legalFirstName: string | null;
        legalMiddleName: string | null;
        legalLastName: string | null;
        phone: string | null;
      }>,
    ) =>
      request<ApiUser>("/profile", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
