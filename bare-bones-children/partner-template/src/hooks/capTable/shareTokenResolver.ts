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
import { orgSlugFor } from "../../utils/payroll/orgSlug";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import DAOGovernorABI from "../../abis/dao/DAOGovernor.abi.json";
import ShareTokenABI from "../../abis/capTable/ShareToken.abi.json";

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

/** Standalone cap-table resolution: local record first (instant), then the subgraph by owner. NOTE: no
 *  RPC log enumeration here on purpose — `eth_getLogs` scans are unreliable/rate-limited and there is no
 *  on-chain slug→ShareToken registry on the factory. The graph-independent path is the *formation* getter
 *  (`resolveFromDaoToken` below); this remains the standalone fallback. */
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

/** Formation path (pure RPC): an org created through formation has its cap table = the DAO's IVotes
 *  token. `PayrollManager.daoOf(slug)` → governor → `governor.token()` → probe `classCount()` to confirm
 *  it's a ShareToken. Returns null when the org has no DAO token (cap table was created standalone). */
export async function resolveFromDaoToken(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  slug: string,
): Promise<string | null> {
  try {
    const pm = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as ethers.ContractInterface, provider);
    const dao = await pm.daoOf(orgSlugFor(slug));
    const governor: string = Array.isArray(dao) ? dao[0] : dao.governor;
    if (!governor || governor === ethers.constants.AddressZero) return null;
    const gov = new ethers.Contract(governor, DAOGovernorABI as ethers.ContractInterface, provider);
    const token: string = await gov.token();
    if (!token || token === ethers.constants.AddressZero) return null;
    const probe = new ethers.Contract(token, ShareTokenABI as ethers.ContractInterface, provider);
    await probe.classCount(); // reverts if `token` isn't a ShareToken
    return token;
  } catch {
    return null;
  }
}

/** Resolve an org's ShareToken across BOTH deployment paths:
 *    1. formation — the DAO token via plain getters (`resolveFromDaoToken`), graph-independent;
 *    2. standalone — local record / subgraph (no RPC log scans).
 *  Use this everywhere (cap table + lending) so the cap table resolves identically in every surface. */
export async function resolveOrgShareToken(
  provider: ethers.providers.Provider | null | undefined,
  chainId: number,
  slug: string,
  owner?: string | null,
  opts?: { payrollManagerAddress?: string | null },
): Promise<string | null> {
  if (provider && opts?.payrollManagerAddress) {
    const fromDao = await resolveFromDaoToken(provider, opts.payrollManagerAddress, slug);
    if (fromDao) {
      saveShareTokenAddress(chainId, slug, fromDao);
      return fromDao;
    }
  }
  return resolveShareTokenAddress(chainId, slug, owner);
}
