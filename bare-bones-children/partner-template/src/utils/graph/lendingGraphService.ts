// Share Lending Market — subgraph reads. The market is a CROSS-ORG order book, so we fetch every
// org's listings (each event carries its slug) into one global book and let the page filter per POV.
// On-chain state only — the asset name / teaser / docs are joined in from BareBonesApi by listingId
// (see lendingMetadataService.ts). Mirrors the entities in
// BareBonesGraph/secure-value-reserve/schema.graphql.
import { graphQuery } from "./graphClient";
import { CHAIN_SVR_SUBGRAPH_URL } from "../../constants/misc";

export interface GraphQuote {
  id: string;
  quoteId: string;
  lender: string;
  amount: string;
  rateBps: number;
  termSeconds: string;
  expiry: string;
  deposit: string;
  status: string; // Open | Accepted | Rejected | Funded | Withdrawn
}

export interface GraphLoan {
  id: string;
  loanId: string;
  lender: string;
  borrower: string;
  principal: string;
  rateBps: number;
  penaltyRateBps: number;
  termSeconds: string;
  startedAt: string | null;
  maturity: string | null;
  status: string; // Accepted | Active | Repaid | Foreclosed | Released
}

export interface GraphListing {
  id: string;
  slug: string;
  listingId: string;
  borrower: string;
  classId: string;
  shares: string;
  wantAmount: string;
  maxRateBps: number;
  termSeconds: string;
  metadataHash: string;
  requireDeposit: boolean;
  depositAmount: string;
  mediator: string;
  status: string; // Open | Accepted | Closed
  loanId: string | null;
  createdAt: string;
  quotes: GraphQuote[];
  loan: GraphLoan | null;
}

export interface GraphOrg {
  id: string;
  slug: string;
  shareToken: string;
}

export interface GraphShareClass {
  id: string; // <shareToken>-<classId>
  classId: string;
  name: string;
}

export interface LendingMarketSnapshot {
  listings: GraphListing[];
  orgs: GraphOrg[];
  classes: GraphShareClass[];
}

const MARKET_QUERY = `
  query LendingMarket($first: Int!) {
    lendingListings(first: $first, orderBy: createdAt, orderDirection: desc) {
      id
      slug
      listingId
      borrower
      classId
      shares
      wantAmount
      maxRateBps
      termSeconds
      metadataHash
      requireDeposit
      depositAmount
      mediator
      status
      loanId
      createdAt
      quotes(first: 100, orderBy: rateBps, orderDirection: asc) {
        id
        quoteId
        lender
        amount
        rateBps
        termSeconds
        expiry
        deposit
        status
      }
      loan {
        id
        loanId
        lender
        borrower
        principal
        rateBps
        penaltyRateBps
        termSeconds
        startedAt
        maturity
        status
      }
    }
    lendingOrgs(first: 200) {
      id
      slug
      shareToken
    }
    shareClasses(first: 500) {
      id
      classId
      name
    }
  }
`;

/** Fetch the whole cross-org lending book for a chain. Returns null when the chain has no subgraph
 *  configured (the page treats that as an empty/unavailable market). */
export async function fetchLendingMarket(chainId: number): Promise<LendingMarketSnapshot | null> {
  const url = CHAIN_SVR_SUBGRAPH_URL[chainId];
  if (!url) return null;
  const data = await graphQuery<{
    lendingListings: GraphListing[];
    lendingOrgs: GraphOrg[];
    shareClasses: GraphShareClass[];
  }>(url, MARKET_QUERY, { first: 500 });
  return {
    listings: data.lendingListings ?? [],
    orgs: data.lendingOrgs ?? [],
    classes: data.shareClasses ?? [],
  };
}
