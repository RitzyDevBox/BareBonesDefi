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
  constructor(public status: number, public code: string) {
    super(code);
    this.name = "ApiError";
  }
}
