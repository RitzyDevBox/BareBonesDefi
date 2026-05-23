// Types mirroring the BareBonesApi response shapes.
// Kept hand-written (not generated) — small surface, easy to keep in sync.

export interface ApiUser {
  id: string;
  walletAddress: string;
  email: string | null;
  legalFirstName: string | null;
  legalMiddleName: string | null;
  legalLastName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiVerifyResponse {
  jwt: string;
  user: {
    id: string;
    walletAddress: string;
  };
}

export interface ApiNonceResponse {
  nonce: string;
}

export class ApiError extends Error {
  // `details` carries structured payload from non-2xx responses (e.g. the
  // submit endpoint's 409 returns `{ error: 'incomplete_draft', missing: [...] }`).
  constructor(
    public status: number,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

// ---------- Entity formation ----------

export type ApiEntityStatus = "DRAFT" | "SUBMITTED" | "FILED" | "REJECTED";

export interface ApiEntityCompletion {
  basics: boolean;
  organizer: boolean;
  contract: boolean;
  agent: boolean;
  agreement: boolean;
  notice: boolean;
}

// PII-scrubbed entity view. Used by list endpoints (`GET /entities`) where
// returning PII per-row would be wasteful and a leak through the wire log.
//
// orgSlug ties the entity to an on-chain organization (the navbar's
// activeOrgSlug). When set, the entity is shared across all admins of that
// org and any signed-in user can read/write. When null the entity is
// DAO-decoupled — only the original owner can access it.
export interface ApiEntitySummary {
  id: string;
  ownerUserId: string;
  orgSlug: string | null;
  status: ApiEntityStatus;
  jurisdiction: string;
  legalName: string;
  managementType: "MEMBER" | "ALGORITHMIC" | null;
  daoAddress: string | null;
  chainId: number | null;
  ein: string | null;
  filingStateFileNumber: string | null;
  formationDate: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedSteps: ApiEntityCompletion;
}

// Full draft as seen by its owner. Returned from GET /entities/:id and from
// POST /entities (find-or-create) so the wizard can prefill form fields on
// refresh. Owner-only via 404-on-mismatch; PII lives in React state while
// the page is open and is never persisted to localStorage.
export interface ApiEntityAddress {
  id: string;
  type: "PRINCIPAL_OFFICE" | "MAILING";
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ApiEntityFull extends ApiEntitySummary {
  businessEmail: string | null;
  businessPhoneE164: string | null;
  businessPhoneCountry: string | null;
  filerFirstName: string | null;
  filerLastName: string | null;
  filerRoleClaim: string | null;
  // filerEmail/Phone* ARE returned (not stripped like PII fields on the
  // summary) — the wizard needs them on hydration so the next organizer
  // save doesn't silently null them when the user clicks Next.
  filerEmail: string | null;
  filerPhoneE164: string | null;
  filerPhoneCountry: string | null;
  filerSameAsBusinessContact: boolean;
  agentMode: "SERVICE" | "OWN" | null;
  agentServiceKey: string | null;
  agentCustomName: string | null;
  agentCustomStreet: string | null;
  agentCustomCity: string | null;
  agentCustomZip: string | null;
  agreementSource: "GENERATE" | "UPLOAD" | null;
  agreementStorage: "OFF" | "ARWEAVE" | "ONCHAIN" | null;
  agreementUri: string | null;
  addresses: ApiEntityAddress[];
}

// Body for POST /entities (find-or-create). When orgSlug is provided the
// lookup is org-scoped: find by (orgSlug, chainId) across all statuses,
// else create with these values locked at creation. When omitted, falls
// back to per-user single-DRAFT semantics.
export interface ApiFindOrCreateInput {
  orgSlug?: string | null;
  chainId?: number | null;
  daoAddress?: string | null;
}

// ---------- Step payloads ----------

export interface ApiAddressInput {
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface ApiBasicsInput {
  legalName: string;
  managementType: "MEMBER" | "ALGORITHMIC";
}

export interface ApiContractInput {
  daoAddress: string | null;
  chainId: number | null;
}

export interface ApiOrganizerInput {
  businessEmail: string | null;
  businessPhoneE164: string | null;
  businessPhoneCountry: string | null;
  filer: {
    firstName: string;
    lastName: string;
    roleClaim: string;
    email: string | null;
    phoneE164: string | null;
    phoneCountry: string | null;
  };
  /** True when the wizard's "Use principal office email & phone for the
   *  organizer" toggle is on. Stored explicitly so it round-trips on
   *  refresh — needed because business/filer values could coincidentally
   *  match (e.g. filer's personal email is the business email). */
  filerSameAsBusinessContact: boolean;
  principalOffice: ApiAddressInput;
  mailing: ApiAddressInput | null;
}

export type ApiAgentInput =
  | { agentMode: "SERVICE"; agentServiceKey: string }
  | {
      agentMode: "OWN";
      agentCustomName: string;
      agentCustomStreet: string;
      agentCustomCity: string;
      agentCustomZip: string;
    };

export interface ApiAgreementInput {
  agreementSource: "GENERATE" | "UPLOAD";
  agreementStorage: "OFF" | "ARWEAVE" | "ONCHAIN";
  agreementUri?: string | null;
}

// ---------- Documents ----------

export type ApiDocumentType =
  | "ARTICLES_DRAFT"
  | "ARTICLES_STAMPED"
  | "OPERATING_AGREEMENT"
  | "MEMBER_ACK"
  | "SUPPORTING";

export type ApiDocumentStorage = "LOCAL" | "S3" | "ARWEAVE";

export interface ApiDocument {
  id: string;
  entityId: string;
  type: ApiDocumentType;
  storage: ApiDocumentStorage;
  uri: string;
  sha256: string;
  contentType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  createdAt: string;
}
