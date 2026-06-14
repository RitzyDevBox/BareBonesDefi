// Resolve an org slug → its deployed ShareToken (cap-table) address.
//
// There is intentionally no on-chain slug→ShareToken registry (the OrgAndDaoLauncher
// is deliberately NOT wired for cap tables yet — see CAPTABLE.md). The factory only
// emits `ShareTokenDeployed(shareToken, owner, …)`. So resolution is two-tiered:
//   1. a client-side record persisted at setup time, keyed by (chainId, slug) — this
//      makes the feature work end-to-end on local/dev before the subgraph lands;
//   2. the subgraph `ShareTokenDeployed` index (added with the graph task), matched by
//      the org owner address, as the durable cross-device source.
// `null` means "no cap table deployed for this org yet" → the UI shows the setup CTA.

import { ethers } from "ethers";
import { CHAIN_SVR_SUBGRAPH_URL } from "../../constants/misc";
import { graphQuery } from "../../utils/graph/graphClient";

const LS_PREFIX = "captable:shareToken";

function key(chainId: number, slug: string): string {
  return `${LS_PREFIX}:${chainId}:${slug.toLowerCase()}`;
}

export function loadShareTokenAddress(chainId: number, slug: string): string | null {
  try {
    const v = localStorage.getItem(key(chainId, slug));
    return v && v !== ethers.constants.AddressZero ? v : null;
  } catch {
    return null;
  }
}

export function saveShareTokenAddress(chainId: number, slug: string, address: string): void {
  try {
    localStorage.setItem(key(chainId, slug), ethers.utils.getAddress(address));
  } catch {
    /* localStorage unavailable — graph fallback still works */
  }
}

interface ShareTokenDeployedRow {
  shareToken: string;
  owner: string;
}
interface ShareTokenGraphResult {
  shareTokenDeployeds?: ShareTokenDeployedRow[];
}

const SHARE_TOKEN_BY_OWNER_QUERY = `
  query ShareTokenByOwner($owner: Bytes!) {
    shareTokenDeployeds(first: 1, orderBy: blockNumber, orderDirection: desc, where: { owner: $owner }) {
      shareToken
      owner
    }
  }
`;

/** Best-effort subgraph lookup by owner address. Returns null on any error (the entity
 *  may not be indexed yet) so the caller can fall back gracefully. */
export async function fetchShareTokenAddressFromGraph(
  chainId: number | null | undefined,
  owner: string,
): Promise<string | null> {
  if (chainId == null) return null;
  const url = CHAIN_SVR_SUBGRAPH_URL[chainId];
  if (!url || !owner) return null;
  try {
    const data = await graphQuery<ShareTokenGraphResult>(url, SHARE_TOKEN_BY_OWNER_QUERY, {
      owner: owner.toLowerCase(),
    });
    const row = data.shareTokenDeployeds?.[0];
    return row?.shareToken && row.shareToken !== ethers.constants.AddressZero ? row.shareToken : null;
  } catch {
    return null;
  }
}

/** Resolve the cap-table address: local record first (instant, dev-friendly), then the
 *  subgraph keyed by the org owner. */
export async function resolveShareTokenAddress(
  chainId: number,
  slug: string,
  owner?: string | null,
): Promise<string | null> {
  const local = loadShareTokenAddress(chainId, slug);
  if (local) return local;
  if (owner) {
    const fromGraph = await fetchShareTokenAddressFromGraph(chainId, owner);
    if (fromGraph) {
      saveShareTokenAddress(chainId, slug, fromGraph);
      return fromGraph;
    }
  }
  return null;
}
