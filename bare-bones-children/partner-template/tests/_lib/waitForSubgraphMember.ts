import { ethers } from "ethers";

const GRAPHQL_URL =
  process.env.PLAYWRIGHT_SUBGRAPH_URL ??
  "http://localhost:8000/subgraphs/name/secure-value-reserve-local";

/** Poll the subgraph until the MTA Member entity for `(slug, wallet)` is
 *  indexed. The tx-confirmation toast fires as soon as the on-chain
 *  onboardPayees / onboardMembers call mines, but every downstream surface
 *  that reads members (PayeesView table, PayBatchesView "addable payees"
 *  dropdown, payroll detail) reads from the subgraph and lags the chain
 *  by a few seconds to a minute. Without this poll the test races the
 *  indexer and the dropdown comes up empty. */
export async function waitForSubgraphMember(
  orgSlug: string,
  walletAddress: string,
  timeoutMs: number = 90_000,
): Promise<void> {
  const slugBytes = ethers.utils.formatBytes32String(orgSlug);
  const wallet = walletAddress.toLowerCase();
  const query = `{
    members(where:{slug:"${slugBytes}",wallet:"${wallet}"}) { id }
  }`;
  const deadline = Date.now() + timeoutMs;
  let lastBody: string | null = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(2_000),
      });
      const text = await res.text();
      lastBody = text.slice(0, 400);
      const body = JSON.parse(text) as {
        data?: { members?: unknown[] };
      };
      if ((body.data?.members?.length ?? 0) > 0) return;
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `subgraph never indexed member ${walletAddress} on slug "${orgSlug}" within ${timeoutMs}ms; last body=${lastBody ?? "(no response)"}`,
  );
}
