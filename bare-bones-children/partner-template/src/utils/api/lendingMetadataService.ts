// Share Lending Market — off-chain listing metadata (asset name, teaser, doc link) in BareBonesApi.
// The contract stores only a `metadataHash`; the rich card content lives here, keyed by
// (chainId, market, slug, listingId) and joined into the on-chain book by listingId.
// Endpoints built in BareBonesApi/src/routes/lending-metadata.ts.
import { API_URL, getJwt } from "../../api/client";
import type { Teaser } from "../../components/Lending/lendingData";

export interface ListingMetadata {
  id: string;
  chainId: number;
  marketAddress: string;
  slug: string;
  listingId: number;
  metadataHash: string;
  asset: string;
  assetSub: string;
  assetType: string;
  teaser: Teaser;
  docLink: string;
}

export interface ListingMetadataInput {
  chainId: number;
  marketAddress: string;
  slug: string;
  listingId: number;
  metadataHash: string;
  asset: string;
  assetSub: string;
  assetType: string;
  teaser: Teaser;
  docLink: string;
}

/** Batch-fetch the off-chain metadata for a set of listingIds under one (chain, market, slug).
 *  Public endpoint (teaser is public). Returns only the ids that exist; tolerant of an unavailable
 *  API (returns []) so the market still renders from on-chain state. */
export async function fetchListingMetadata(
  chainId: number,
  marketAddress: string,
  slug: string,
  listingIds: number[],
): Promise<ListingMetadata[]> {
  if (listingIds.length === 0) return [];
  const qs = new URLSearchParams({
    chainId: String(chainId),
    marketAddress: marketAddress.toLowerCase(),
    slug: slug.toLowerCase(),
    listingIds: listingIds.join(","),
  });
  try {
    const res = await fetch(`${API_URL}/lending/metadata?${qs.toString()}`);
    if (!res.ok) return [];
    return (await res.json()) as ListingMetadata[];
  } catch {
    return [];
  }
}

/** Persist a new listing's metadata (SIWE-authed; the API re-checks the caller is the on-chain
 *  borrower and the hash matches). Throws on failure so the caller can surface it. */
export async function postListingMetadata(input: ListingMetadataInput): Promise<ListingMetadata> {
  const jwt = getJwt();
  const res = await fetch(`${API_URL}/lending/metadata`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) code = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(code);
  }
  return (await res.json()) as ListingMetadata;
}
