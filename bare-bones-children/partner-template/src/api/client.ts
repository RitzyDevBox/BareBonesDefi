import {
  ApiAgentInput,
  ApiAgreementInput,
  ApiBasicsInput,
  ApiContractInput,
  ApiDocument,
  ApiDocumentType,
  ApiEntityFull,
  ApiEntitySummary,
  ApiError,
  ApiFindOrCreateInput,
  ApiNonceResponse,
  ApiOrganizerInput,
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
  // Default to JSON unless the caller already set a Content-Type. Raw
  // uploads pass their own mime (e.g. application/pdf) and a Buffer/Blob
  // body — we MUST NOT override that with application/json.
  const callerHeaders = (opts.headers as Record<string, string>) ?? {};
  const headers: Record<string, string> = {
    ...(callerHeaders["Content-Type"] || callerHeaders["content-type"]
      ? {}
      : { "Content-Type": "application/json" }),
    ...callerHeaders,
  };
  const jwt = getJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });

  if (!res.ok) {
    let code = `http_${res.status}`;
    let details: Record<string, unknown> | undefined;
    try {
      const body = await res.json();
      if (body?.error) code = body.error;
      // Pass through any extra structured fields so callers can read
      // e.g. `missing: string[]` on the submit 409.
      if (body && typeof body === "object") details = body;
    } catch {
      // body wasn't JSON — keep the http_<status> code
    }
    throw new ApiError(res.status, code, details);
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
  entities: {
    // Find-or-create. Two paths depending on whether the caller supplies an
    // orgSlug from the navbar context:
    //   Org-scoped — looks up by (orgSlug, chainId) across all statuses;
    //     returns the existing entity (any status) or mints a new one with
    //     the supplied values baked in. Wizard renders read-only when the
    //     returned status != DRAFT (already-filed entities).
    //   DAO-decoupled (no orgSlug) — returns the user's open DRAFT or
    //     mints a fresh one.
    // daoAddress is the governor for the org, resolved upstream by the page
    // (payrollManager.daoOf). Locked at creation; Contract step renders
    // read-only for org-scoped entities.
    findOrCreate: (input: ApiFindOrCreateInput = {}) =>
      request<ApiEntityFull>("/entities", {
        method: "POST",
        body: JSON.stringify({ jurisdiction: "wy", ...input }),
      }),
    get: (entityId: string) => request<ApiEntityFull>(`/entities/${entityId}`),
    basics: (entityId: string, data: ApiBasicsInput) =>
      request<ApiEntitySummary>(`/entities/${entityId}/basics`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    organizer: (entityId: string, data: ApiOrganizerInput) =>
      request<ApiEntitySummary>(`/entities/${entityId}/organizer`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    contract: (entityId: string, data: ApiContractInput) =>
      request<ApiEntitySummary>(`/entities/${entityId}/contract`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    agent: (entityId: string, data: ApiAgentInput) =>
      request<ApiEntitySummary>(`/entities/${entityId}/agent`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    agreement: (entityId: string, data: ApiAgreementInput) =>
      request<ApiEntitySummary>(`/entities/${entityId}/agreement`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    notice: (entityId: string) =>
      request<ApiEntitySummary>(`/entities/${entityId}/notice`, {
        method: "POST",
        body: JSON.stringify({ ack: true }),
      }),
    submit: (entityId: string) =>
      request<ApiEntitySummary>(`/entities/${entityId}/submit`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
  },
  documents: {
    list: (entityId: string) =>
      request<ApiDocument[]>(`/entities/${entityId}/documents`),
    // Single-file raw upload — no multipart. file.type goes in
    // Content-Type, doc type in the query string.
    upload: (entityId: string, file: File, type: ApiDocumentType) =>
      request<ApiDocument>(
        `/entities/${entityId}/documents?type=${encodeURIComponent(type)}`,
        {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        },
      ),
    rawUrl: (entityId: string, docId: string) =>
      `${API_URL}/entities/${entityId}/documents/${docId}/raw`,
    delete: (entityId: string, docId: string) =>
      request<void>(`/entities/${entityId}/documents/${docId}`, {
        method: "DELETE",
      }),
  },
};
